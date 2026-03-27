/**
 * Custom hook for managing ScanForm state
 */

import { useState, useCallback } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __, sprintf, _n } from '@wordpress/i18n';
import type {
	ScanFormOrigin,
	ScanFormLabel,
	ReviewResult,
	OriginsApiResponse,
	ReviewApiResponse,
	CreateApiResponse,
	ScanFormApiError,
	ScanFormErrorData,
} from 'types';
import {
	getCreateScanFormPath,
	getScanFormOriginsPath,
	getScanFormReviewPath,
} from 'data/routes';

export const useScanFormState = () => {
	// Loading and error states
	const [ isLoading, setIsLoading ] = useState( true );
	const [ isCreating, setIsCreating ] = useState( false );
	const [ isReviewing, setIsReviewing ] = useState( false );
	const [ error, setError ] = useState< string | null >( null );
	const [ successMessage, setSuccessMessage ] = useState< string | null >(
		null
	);

	// Data states
	const [ origins, setOrigins ] = useState< ScanFormOrigin[] >( [] );
	const [ selectedOrigin, setSelectedOrigin ] =
		useState< ScanFormOrigin | null >( null );
	const [ labels, setLabels ] = useState< ScanFormLabel[] >( [] );
	const [ selectedLabels, setSelectedLabels ] = useState< Set< number > >(
		new Set()
	);
	const [ reviewResult, setReviewResult ] = useState< ReviewResult | null >(
		null
	);
	const [ pdfUrl, setPdfUrl ] = useState< string | null >( null );
	const [ processedLabelIds, setProcessedLabelIds ] = useState< number[] >(
		[]
	);
	const [ failedLabelsError, setFailedLabelsError ] =
		useState< ScanFormErrorData | null >( null );

	// Step states
	const [ showLabelSelectionStep, setShowLabelSelectionStep ] =
		useState( false );
	const [ showReviewStep, setShowReviewStep ] = useState( false );
	const [ showCompletedStep, setShowCompletedStep ] = useState( false );

	/**
	 * Fetch origin addresses from the API (Step 1 - lightweight)
	 */
	const fetchOrigins = useCallback( async () => {
		setIsLoading( true );
		setError( null );

		try {
			const response = await apiFetch< OriginsApiResponse >( {
				path: getScanFormOriginsPath(),
				method: 'GET',
			} );

			if ( response.success && response.origins ) {
				setOrigins( response.origins );
			} else {
				setError(
					__(
						'No eligible labels found. Please ensure you have USPS labels with tracking numbers that have not been refunded.',
						'woocommerce-shipping'
					)
				);
			}
		} catch ( err ) {
			const errorMessage =
				err instanceof Error
					? err.message
					: __(
							'Failed to fetch origin addresses.',
							'woocommerce-shipping'
					  );
			setError( errorMessage );
		} finally {
			setIsLoading( false );
		}
	}, [] );

	/**
	 * Toggle a single label selection
	 */
	const toggleLabel = useCallback( ( labelId: number ) => {
		setSelectedLabels( ( prevSelected ) => {
			const newSelected = new Set( prevSelected );
			if ( newSelected.has( labelId ) ) {
				newSelected.delete( labelId );
			} else {
				newSelected.add( labelId );
			}
			return newSelected;
		} );
	}, [] );

	/**
	 * Toggle all labels
	 */
	const toggleAllLabels = useCallback( () => {
		const allLabelIds = labels.map( ( label ) => label.label_id );

		setSelectedLabels( ( prevSelected ) => {
			const allSelected = allLabelIds.every( ( id ) =>
				prevSelected.has( id )
			);
			const newSelected = new Set( prevSelected );

			if ( allSelected ) {
				allLabelIds.forEach( ( id ) => newSelected.delete( id ) );
			} else {
				allLabelIds.forEach( ( id ) => newSelected.add( id ) );
			}

			return newSelected;
		} );
	}, [ labels ] );

	/**
	 * Review selected labels before creating ScanForm
	 */
	const reviewLabels = useCallback( async () => {
		if ( selectedLabels.size === 0 ) {
			setError(
				__(
					'Please select at least one label.',
					'woocommerce-shipping'
				)
			);
			return;
		}

		setIsReviewing( true );
		setError( null );
		setReviewResult( null );

		try {
			const response = await apiFetch< ReviewApiResponse >( {
				path: getScanFormReviewPath(),
				method: 'POST',
				data: {
					label_ids: Array.from( selectedLabels ),
				},
			} );

			if ( response.success ) {
				setReviewResult( {
					eligible: response.eligible ?? [],
					already_scanned: response.already_scanned ?? [],
					not_found: response.not_found ?? [],
					invalid_site: response.invalid_site ?? [],
				} );
				setShowReviewStep( true );
			} else {
				setError(
					__( 'Failed to review labels.', 'woocommerce-shipping' )
				);
			}
		} catch ( err ) {
			const errorMessage =
				err instanceof Error
					? err.message
					: __( 'Failed to review labels.', 'woocommerce-shipping' );
			setError( errorMessage );
		} finally {
			setIsReviewing( false );
		}
	}, [ selectedLabels ] );

	/**
	 * Create ScanForm from eligible labels (or specific label IDs if provided)
	 */
	const createScanForm = useCallback(
		async ( labelIds?: number[] ) => {
			const labelsToProcess = labelIds ?? reviewResult?.eligible ?? [];

			if ( labelsToProcess.length === 0 ) {
				setError(
					__(
						'No eligible labels to create SCAN Form.',
						'woocommerce-shipping'
					)
				);
				return;
			}

			setIsCreating( true );
			setError( null );
			setSuccessMessage( null );
			setFailedLabelsError( null );

			try {
				const response = await apiFetch< CreateApiResponse >( {
					path: getCreateScanFormPath(),
					method: 'POST',
					data: {
						label_ids: labelsToProcess,
					},
				} );

				if ( response.success && response.scan_form ) {
					const { pdf_url, label_count } = response.scan_form;

					setSuccessMessage(
						sprintf(
							/* translators: %d is number of labels */
							_n(
								'SCAN Form created successfully for %d label!',
								'SCAN Form created successfully for %d labels!',
								label_count,
								'woocommerce-shipping'
							),
							label_count
						)
					);

					setPdfUrl( pdf_url || null );
					setProcessedLabelIds( labelsToProcess );
					setShowReviewStep( false );
					setShowCompletedStep( true );
				} else {
					setError(
						__(
							'Failed to create SCAN Form.',
							'woocommerce-shipping'
						)
					);
				}
			} catch ( err ) {
				// Check if error contains failed_labels and valid_labels data
				const apiError = err as ScanFormApiError;
				if (
					apiError.data?.failed_labels &&
					apiError.data?.valid_labels
				) {
					// Set the failed labels error for confirmation
					setFailedLabelsError( apiError.data );
				} else {
					// Regular error handling
					const errorMessage =
						err instanceof Error
							? err.message
							: __(
									'Failed to create SCAN Form.',
									'woocommerce-shipping'
							  );
					setError( errorMessage );
				}
			} finally {
				setIsCreating( false );
			}
		},
		[ reviewResult ]
	);

	/**
	 * Select an origin and proceed to label selection
	 */
	const selectOriginAndProceed = useCallback( ( origin: ScanFormOrigin ) => {
		setSelectedOrigin( origin );
		setError( null );
		setShowLabelSelectionStep( true );

		// Use labels from the origin (already fetched with origins)
		setLabels( origin.labels );

		// Auto-select all labels
		const allLabelIds = origin.labels.map( ( label ) => label.label_id );
		setSelectedLabels( new Set( allLabelIds ) );
	}, [] );

	/**
	 * Go back to origin selection step
	 */
	const goBackToOriginSelection = useCallback( () => {
		setShowLabelSelectionStep( false );
		setSelectedOrigin( null );
		setLabels( [] );
		setSelectedLabels( new Set() );
		setError( null );
	}, [] );

	/**
	 * Go back to label selection step
	 */
	const goBackToLabelSelection = useCallback( () => {
		setShowReviewStep( false );
		setReviewResult( null );
	}, [] );

	/**
	 * Get label info by label ID
	 */
	const getLabelInfo = useCallback(
		( labelId: number ): ScanFormLabel | null => {
			const label = labels.find( ( l ) => l.label_id === labelId );
			return label ?? null;
		},
		[ labels ]
	);

	/**
	 * Retry creating ScanForm with only valid labels (after some labels failed)
	 */
	const retryWithValidLabels = useCallback( () => {
		if ( ! failedLabelsError?.valid_labels ) {
			return;
		}

		// Dismiss the error and retry with valid labels
		setFailedLabelsError( null );
		createScanForm( failedLabelsError.valid_labels );
	}, [ failedLabelsError, createScanForm ] );

	/**
	 * Dismiss the failed labels error dialog
	 */
	const dismissFailedLabelsError = useCallback( () => {
		setFailedLabelsError( null );
	}, [] );

	/**
	 * Set selected labels directly (for DataViews integration)
	 */
	const setLabelSelection = useCallback( ( labelIds: number[] ) => {
		setSelectedLabels( new Set( labelIds ) );
	}, [] );

	/**
	 * Set selected origin.
	 */
	const setOriginSelection = useCallback( ( origin: ScanFormOrigin ) => {
		setSelectedOrigin( origin );
	}, [] );

	return {
		// States
		isLoading,
		isCreating,
		isReviewing,
		error,
		successMessage,
		origins,
		selectedOrigin,
		labels,
		selectedLabels,
		reviewResult,
		pdfUrl,
		processedLabelIds,
		failedLabelsError,
		showLabelSelectionStep,
		showReviewStep,
		showCompletedStep,

		// Actions
		fetchOrigins,
		toggleLabel,
		toggleAllLabels,
		setLabelSelection,
		setOriginSelection,
		reviewLabels,
		createScanForm,
		selectOriginAndProceed,
		goBackToOriginSelection,
		goBackToLabelSelection,
		getLabelInfo,
		retryWithValidLabels,
		dismissFailedLabelsError,
		setError,
	};
};
