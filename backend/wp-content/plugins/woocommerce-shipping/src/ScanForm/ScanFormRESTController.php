<?php
/**
 * ScanForm REST Controller
 *
 * Handles REST API requests for USPS ScanForms.
 *
 * @package Automattic\WCShipping\ScanForm
 */

namespace Automattic\WCShipping\ScanForm;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Automattic\WCShipping\Connect\WC_Connect_API_Client;
use Automattic\WCShipping\Connect\WC_Connect_Functions;
use Automattic\WCShipping\Connect\WC_Connect_Logger;
use Automattic\WCShipping\WCShippingRESTController;
use WP_Error;
use WP_REST_Response;
use WP_REST_Request;

/**
 * ScanForm REST Controller class.
 */
class ScanFormRESTController extends WCShippingRESTController {

	/**
	 * ScanForm service.
	 *
	 * @var ScanFormService
	 */
	private ScanFormService $scanform_service;

	/**
	 * @var WC_Connect_API_Client
	 */
	protected WC_Connect_API_Client $api_client;

	/**
	 * Logger for the connect server.
	 *
	 * @var WC_Connect_Logger
	 */
	protected WC_Connect_Logger $logger;

	/**
	 * Class constructor.
	 *
	 * @param ScanFormService       $scanform_service     ScanForm service instance.
	 * @param WC_Connect_API_Client $api_client     Server API client instance.
	 * @param WC_Connect_Logger     $logger         Logging utility.
	 */
	public function __construct( ScanFormService $scanform_service, WC_Connect_API_Client $api_client, WC_Connect_Logger $logger ) {
		$this->scanform_service = $scanform_service;
		$this->api_client       = $api_client;
		$this->logger           = $logger;
	}

	/**
	 * Endpoint namespace.
	 *
	 * @var string
	 */
	protected $rest_base = 'scan-form';

	/**
	 * Register routes for ScanForm endpoints.
	 */
	public function register_routes() {
		// GET /wcshipping/v1/scan-form/origins - Get origin addresses with label counts.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/origins',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_origin_addresses' ),
					'permission_callback' => array( WC_Connect_Functions::class, 'user_can_manage_labels' ),
				),
			)
		);

		// POST /wcshipping/v1/scan-form/create - Create ScanForm.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/create',
			array(
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'create_scan_form' ),
					'permission_callback' => array( WC_Connect_Functions::class, 'user_can_manage_labels' ),
				),
			)
		);

		// POST /wcshipping/v1/scan-form/review - Review labels before creating ScanForm.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/review',
			array(
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'review_scan_form' ),
					'permission_callback' => array( WC_Connect_Functions::class, 'user_can_manage_labels' ),
				),
			)
		);
	}

	/**
	 * Get origin addresses with labels data (combined endpoint for step 1 and 2).
	 *
	 * Returns origin addresses with full label data, eliminating the need for a separate
	 * labels request. This reduces API calls from 2 to 1 when opening the ScanForm modal.
	 *
	 * @return WP_REST_Response Response with origin addresses and their labels.
	 */
	public function get_origin_addresses(): WP_REST_Response {
		// Get orders and their eligible shipments (today or later).
		$eligible_shipments_by_order = $this->scanform_service->get_orders_with_eligible_shipping_dates();

		if ( empty( $eligible_shipments_by_order ) ) {
			return new WP_REST_Response(
				array(
					'success' => true,
					'origins' => array(),
				),
				200
			);
		}

		// Derive order IDs from the eligible shipments map.
		$order_ids = array_map( 'intval', array_keys( $eligible_shipments_by_order ) );

		// Fetch all labels, origins, and ScanForms in bulk (3 queries instead of 4).
		$all_labels     = $this->scanform_service->get_order_meta_bulk( $order_ids, 'wcshipping_labels' );
		$all_origins    = $this->scanform_service->get_order_meta_bulk( $order_ids, '_wcshipping_selected_origin' );
		$all_scan_forms = $this->scanform_service->get_order_meta_bulk( $order_ids, '_wcshipping_scan_forms' );

		// Build a set of all label IDs that are already in ScanForms.
		$labels_in_scan_forms = array();
		foreach ( $all_scan_forms as $scan_forms ) {
			if ( ! is_array( $scan_forms ) ) {
				continue;
			}
			foreach ( $scan_forms as $scan_form ) {
				if ( ! empty( $scan_form['label_ids'] ) && is_array( $scan_form['label_ids'] ) ) {
					$labels_in_scan_forms = array_merge( $labels_in_scan_forms, $scan_form['label_ids'] );
				}
			}
		}

		$origin_groups = array();
		$orders_cache  = array(); // Cache order objects for order_number and shipping_name.

		foreach ( $order_ids as $order_id ) {
			// Get labels for this order from bulk fetched data.
			$order_labels = $all_labels[ $order_id ] ?? null;
			if ( empty( $order_labels ) || ! is_array( $order_labels ) ) {
				continue;
			}

			// Get all origins for this order (keyed by shipment ID) from bulk fetched data.
			$selected_origins = $all_origins[ $order_id ] ?? null;
			if ( empty( $selected_origins ) || ! is_array( $selected_origins ) ) {
				continue;
			}

			// Get eligible shipments for this order (keyed by shipment ID).
			$eligible_shipments = isset( $eligible_shipments_by_order[ $order_id ] ) && is_array( $eligible_shipments_by_order[ $order_id ] )
				? $eligible_shipments_by_order[ $order_id ]
				: array();

			if ( empty( $eligible_shipments ) ) {
				continue;
			}

			foreach ( $order_labels as $label ) {
				$label_id     = $label['label_id'];
				$shipment_id  = $label['id'];
				$shipment_key = 'shipment_' . $shipment_id;

				// Skip if this label is already in a ScanForm.
				if ( in_array( $label_id, $labels_in_scan_forms, true ) ) {
					continue;
				}

				// Check if label is eligible for ScanForm.
				if ( ! $this->scanform_service->is_label_eligible( $label ) ) {
					continue;
				}

				// Skip if this shipment is not in the pre-filtered eligible set.
				if ( empty( $eligible_shipments[ $shipment_key ] ) ) {
					continue;
				}

				// Get the origin address for this specific label.
				$label_origin = $selected_origins[ $shipment_key ] ?? null;
				if ( empty( $label_origin ) ) {
					continue;
				}

				// Generate a unique origin ID based on address components.
				$origin_id = $this->scanform_service->get_origin_address_key( $label_origin );

				// Initialize origin group if not exists.
				if ( ! isset( $origin_groups[ $origin_id ] ) ) {
					$origin_groups[ $origin_id ] = array(
						'origin_id'      => $origin_id,
						'origin_address' => $label_origin,
						'labels'         => array(),
						'label_count'    => 0,
					);
				}

				// Load order object for order_number and shipping_name (lazy loading).
				if ( ! isset( $orders_cache[ $order_id ] ) ) {
					$orders_cache[ $order_id ] = wc_get_order( $order_id );
				}

				$order = $orders_cache[ $order_id ];
				if ( ! $order ) {
					continue;
				}

				// Build label data with all fields needed for step 2.
				$label_data = array(
					'label_id'      => $label_id,
					'order_id'      => $order_id,
					'tracking'      => $label['tracking'],
					'created'       => $label['created'],
					'service_name'  => $label['service_name'],
					'order_number'  => $order->get_order_number(),
					'shipping_name' => $order->get_formatted_shipping_full_name(),
					'shipping_date' => $eligible_shipments[ $shipment_key ]['shipping_date'] ?? '-',
				);

				// Add label to origin group.
				$origin_groups[ $origin_id ]['labels'][] = $label_data;
				++$origin_groups[ $origin_id ]['label_count'];
			}
		}

		return new WP_REST_Response(
			array(
				'success' => true,
				'origins' => array_values( $origin_groups ),
			),
			200
		);
	}

	/**
	 * Create a ScanForm from selected label IDs.
	 *
	 * @param WP_REST_Request $request Request object containing label_ids.
	 *
	 * @return WP_REST_Response|WP_Error Response with ScanForm data and PDF URL.
	 */
	public function create_scan_form( WP_REST_Request $request ) {
		// Validate label IDs.
		$label_ids = $this->scanform_service->validate_label_ids( $request );
		if ( is_wp_error( $label_ids ) ) {
			return $label_ids;
		}

		// Prepare request body for ScanForm API.
		$body = array(
			'label_ids' => $label_ids,
		);

		// Call the API to create ScanForm.
		$response = $this->api_client->send_scan_form( $body );

		if ( is_wp_error( $response ) ) {
			$error_message = $response->get_error_message();

			// Parse error for failed shipments/labels.
			$failed_info = $this->scanform_service->parse_scan_form_error( $error_message, $label_ids );

			$error_data = array(
				'message'       => $error_message,
				'failed_labels' => $failed_info['failed_labels'],
				'valid_labels'  => $failed_info['valid_labels'],
			);

			$error = new WP_Error(
				$response->get_error_code(),
				$error_message,
				$error_data
			);
			$this->logger->log( $error->get_error_message(), __CLASS__ );
			return $error;
		}

		// Check if response has error.
		if ( isset( $response->error ) ) {
			$error_code    = $response->error->code ?? 'scan_form_error';
			$error_message = $response->error->message ?? __( 'Failed to create SCAN Form', 'woocommerce-shipping' );

			// Parse error for failed shipments/labels.
			$failed_info = $this->scanform_service->parse_scan_form_error( $error_message, $label_ids );

			$error_data = array(
				'message'       => $error_message,
				'failed_labels' => $failed_info['failed_labels'],
				'valid_labels'  => $failed_info['valid_labels'],
			);

			$error = new WP_Error( $error_code, $error_message, $error_data );
			$this->logger->log( $error->get_error_message(), __CLASS__ );

			return $error;
		}

		// Save ScanForm information to order meta.
		$scan_form_data = array(
			'scan_form_id' => $response->scan_form_id ?? null,
			'pdf_url'      => $response->form_url ?? null,
			'created'      => $response->created ?? gmdate( 'c' ),
			'label_ids'    => $label_ids,
		);

		// Get order_labels mapping from server response.
		$order_labels = $response->order_labels ?? array();

		$this->scanform_service->save_scan_form_to_orders( $scan_form_data, $order_labels );

		// Return ScanForm data with PDF URL.
		return new WP_REST_Response(
			array(
				'success'   => true,
				'scan_form' => array(
					'scan_form_id' => $response->scan_form_id ?? null,
					'pdf_url'      => $response->form_url ?? null,
					'created'      => $response->created ?? gmdate( 'c' ),
					'label_count'  => count( $label_ids ),
				),
			),
			200
		);
	}

	/**
	 * Review labels before creating a ScanForm.
	 *
	 * @param WP_REST_Request $request Request object containing label_ids.
	 *
	 * @return WP_REST_Response|WP_Error Response with review results.
	 */
	public function review_scan_form( WP_REST_Request $request ) {
		// Validate label IDs.
		$label_ids = $this->scanform_service->validate_label_ids( $request );
		if ( is_wp_error( $label_ids ) ) {
			return $label_ids;
		}

		// Prepare request body for review API.
		$body = array(
			'label_ids' => $label_ids,
		);

		// Call the API to review labels.
		$response = $this->api_client->review_scan_form( $body );

		if ( is_wp_error( $response ) ) {
			$error = new WP_Error(
				$response->get_error_code(),
				$response->get_error_message(),
				array( 'message' => $response->get_error_message() )
			);
			$this->logger->log( $error->get_error_message(), __CLASS__ );
			return $error;
		}

		// Check if response has error.
		if ( isset( $response->error ) ) {
			$error = new WP_Error(
				$response->error->code ?? 'review_error',
				$response->error->message ?? __( 'Failed to review labels', 'woocommerce-shipping' ),
				array( 'message' => $response->error->message ?? __( 'Failed to review labels', 'woocommerce-shipping' ) )
			);
			$this->logger->log( $error->get_error_message(), __CLASS__ );
			return $error;
		}

		// Return review results.
		return new WP_REST_Response(
			array(
				'success'         => true,
				'eligible'        => $response->eligible ?? array(),
				'already_scanned' => $response->already_scanned ?? array(),
				'not_found'       => $response->not_found ?? array(),
				'invalid_site'    => $response->invalid_site ?? array(),
			),
			200
		);
	}
}
