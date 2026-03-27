/**
 * Completion Step - Step 4 of ScanForm creation
 */

import { Button, Notice } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import type { ScanFormLabel } from 'types';

interface CompletionStepProps {
	successMessage: string;
	processedLabelIds: number[];
	pdfUrl: string | null;
	getLabelInfo: ( labelId: number ) => ScanFormLabel | null;
}

export const CompletionStep = ( {
	successMessage,
	processedLabelIds,
	pdfUrl,
	getLabelInfo,
}: CompletionStepProps ) => {
	return (
		<>
			<Notice status="success" isDismissible={ false }>
				{ successMessage }
			</Notice>

			<div className="scan-form-modal__completion-info">
				<strong className="scan-form-modal__completion-label">
					{ __( 'Processed Labels:', 'woocommerce-shipping' ) }
				</strong>
				<ul className="scan-form-modal__completion-list">
					{ processedLabelIds.map( ( labelId ) => {
						const label = getLabelInfo( labelId );
						return label ? (
							<li key={ labelId }>
								{ sprintf(
									/* translators: %1$s is order number, %2$s is tracking number, %3$s is service name */
									__(
										'Order #%1$s - %2$s - %3$s',
										'woocommerce-shipping'
									),
									label.order_number ?? '',
									label.tracking ?? '',
									label.service_name
								) }
							</li>
						) : (
							<li key={ labelId }>
								{ sprintf(
									/* translators: %d is label ID */
									__(
										'Label ID: %d',
										'woocommerce-shipping'
									),
									labelId
								) }
							</li>
						);
					} ) }
				</ul>
			</div>

			{ pdfUrl && (
				<div className="scan-form-modal__pdf-button-wrapper">
					<Button
						variant="secondary"
						onClick={ () =>
							window.open(
								pdfUrl,
								'_blank',
								'noopener,noreferrer'
							)
						}
					>
						{ __( 'View SCAN Form PDF', 'woocommerce-shipping' ) }
					</Button>
				</div>
			) }
		</>
	);
};
