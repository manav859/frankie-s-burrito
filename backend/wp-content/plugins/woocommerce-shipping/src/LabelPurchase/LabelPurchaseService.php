<?php
/**
 * Class LabelPurchaseService
 *
 * @package Automattic\WCShipping
 */

namespace Automattic\WCShipping\LabelPurchase;

use Automattic\WCShipping\Connect\WC_Connect_Service_Settings_Store;
use Automattic\WCShipping\Connect\WC_Connect_API_Client;
use Automattic\WCShipping\Connect\WC_Connect_Logger;
use Automattic\WCShipping\Connect\WC_Connect_Utils;
use Automattic\WCShipping\Promo\PromoService;
use Automattic\WCShipping\Fulfillments\FulfillmentsService;
use Automattic\WCShipping\Utils;
use Automattic\WCShipping\Shipments\ShipmentsService;
use Automattic\WCShipping\Fulfillments\ShippingFulfillment;
use WP_Error;

/**
 * Class to handle label purchase requests.
 */
class LabelPurchaseService {

	/**
	 * Connect Server settings store.
	 *
	 * @var WC_Connect_Service_Settings_Store
	 */
	private $settings_store;

	/**
	 * Connect Server API client.
	 *
	 * @var WC_Connect_API_Client
	 */
	private $api_client;

	/**
	 * Connect Label Service.
	 *
	 * @var View
	 */
	private $connect_label_service;

	/**
	 * Logger utility.
	 *
	 * @var WC_Connect_Logger
	 */
	private $logger;

	/**
	 * Promo service.
	 *
	 * @var PromoService
	 */
	private $promo_service;

	/**
	 * Fulfillments service.
	 *
	 * @var FulfillmentsService
	 */
	private $fulfillments_service;

	/**
	 * Selected rates key used to store selected rates in order meta.
	 *
	 * @var string
	 */
	const SELECTED_RATES_KEY = '_wcshipping_selected_rates';
	/**
	 * Selected hazmat key used to store selected hazmat in order meta.
	 *
	 * @var string
	 */
	const SELECTED_HAZMAT_KEY = '_wcshipping_selected_hazmat';

	/**
	 * Selected hazmat key used to store selected hazmat in order meta.
	 *
	 * @var string
	 */
	const SELECTED_ORIGIN_KEY = '_wcshipping_selected_origin';

	/**
	 * Selected hazmat key used to store selected hazmat in order meta.
	 *
	 * @var string
	 */
	const SELECTED_DESTINATION_KEY = '_wcshipping_selected_destination';

	/**
	 * Key used to store customs information in order meta.
	 *
	 * @var string
	 */
	const CUSTOMS_INFORMATION = '_wcshipping_customs_information';

	/**
	 * Key used to store order shipments in order meta.
	 *
	 * @var string
	 */
	const ORDER_SHIPMENTS = '_wcshipping-shipments';


	/**
	 * Key used to store shipment dates in order meta.
	 *
	 * @var string
	 */
	const SHIPMENT_DATES = '_wcshipping_shipment_dates';
	/**
	 * Key used to store package dimensions in order meta.
	 *
	 * @var string
	 */
	const PACKAGE_DIMENSIONS = '_wcshipping_package_dimensions';

	/**
	 * Class constructor.
	 *
	 * @param WC_Connect_Service_Settings_Store $settings_store        Server settings store instance.
	 * @param WC_Connect_API_Client             $api_client            Server API client instance.
	 * @param View                              $connect_label_service Connect Label Service instance.
	 * @param WC_Connect_Logger                 $logger                Server API client instance.
	 * @param PromoService                      $promo_service         Promo service instance.
	 * @param FulfillmentsService               $fulfillments_service  Fulfillments service instance.
	 */
	public function __construct(
		WC_Connect_Service_Settings_Store $settings_store,
		WC_Connect_API_Client $api_client,
		View $connect_label_service,
		WC_Connect_Logger $logger,
		PromoService $promo_service,
		FulfillmentsService $fulfillments_service
	) {
		$this->settings_store        = $settings_store;
		$this->api_client            = $api_client;
		$this->connect_label_service = $connect_label_service;
		$this->logger                = $logger;
		$this->promo_service         = $promo_service;
		$this->fulfillments_service  = $fulfillments_service;
	}

	/**
	 * Get labels for order.
	 *
	 * @param int $order_id WC Order ID.
	 * @return array REST response body.
	 */
	public function get_labels( $order_id ) {
		$response = $this->connect_label_service->get_label_payload( $order_id );
		if ( ! $response ) {
			$message = __( 'Order not found', 'woocommerce-shipping' );
			return new WP_Error(
				401,
				$message,
				array(
					'success' => false,
					'message' => $message,
				),
			);
		}

		return array(
			'success' => true,
			'labels'  => $response['currentOrderLabels'],
		);
	}

	/**
	 * Purchase labels for order.
	 *
	 * @param array  $origin      Origin address.
	 * @param array  $destination Destination address.
	 * @param array  $packages   Packages to purchase labels for.
	 * @param int    $order_id    WC Order ID.
	 * @param array  $selected_rate Selected rate. { rate: array, parent?: array }
	 * @param array  $selected_rate_options Selected rate options.
	 * @param array  $hazmat Selected HAZMAT category and if shipment includes HAZMAT.
	 * @param array  $customs Customs form information.
	 * @param array  $user_meta User meta array.
	 * @param array  $features_supported_by_client Features supported by client.
	 * @param array  $shipment_options Extra options.
	 * @param bool   $is_return Whether this is a return shipment.
	 * @param string $parent_shipment_id For return shipments: which shipment ID this is a return for.
	 * @return array|WP_Error REST response body.
	 */
	public function purchase_labels(
		$origin,
		$destination,
		$packages,
		$order_id,
		$selected_rate,
		$selected_rate_options,
		$hazmat,
		$customs,
		$user_meta = array(),
		$features_supported_by_client = array(),
		$shipment_options = array(),
		$is_return = false,
		$parent_shipment_id = null
	) {
		$settings         = $this->settings_store->get_account_settings();
		$service_names    = array_column( $packages, 'service_name' );
		$request_packages = $this->prepare_packages_for_purchase( $packages );

		if ( ! empty( $user_meta ) ) {
			$this->update_user_meta( $user_meta );
		}

		if ( Utils::should_use_fulfillment_api() ) {
			$fulfillment = $this->fulfillments_service->ensure_order_has_fulfillment( $order_id );
			// If there is only one fulfillment, we can use it directly
			if ( is_array( $fulfillment ) && count( $fulfillment ) === 1 ) {
				$fulfillment = $fulfillment[0];
			}
			// Todo: Take care of cases where there are multiple fulfillments.
		} else {
			/**
			 * Ensure the order has shipments.
			 * This will create data consistency between the shipments and the labels.
			 */
			$this->ensure_order_has_shipments( $order_id );
		}

		$origin_address_id = 'UNKNOWN_ORIGIN_ID';
		// Assuming only verified addresses are being used to purchase labels.
		$is_origin_address_verified = true;
		// Todo: To be updated via  woocommerce-shipping/issues/859
		if ( isset( $origin['id'] ) ) {
			$origin_address_id = $origin['id'];
			unset( $origin['id'] );
		}

		if ( isset( $origin['is_verified'] ) ) {
			$is_origin_address_verified = $origin['is_verified'];
			unset( $origin['is_verified'] );
		}

		// Extract label_date from shipment_options, default to null if not present
		$label_date = isset( $shipment_options['label_date'] ) ? $shipment_options['label_date'] : null;

		$label_response = $this->api_client->send_shipping_label_request(
			array(
				'async'                        => true,
				'email_receipt'                => $settings['email_receipts'] ?? false,
				'origin'                       => $origin,
				'destination'                  => $destination,
				'payment_method_id'            => $this->settings_store->get_selected_payment_method_id(),
				'order_id'                     => $order_id,
				'packages'                     => $request_packages,
				'features_supported_by_client' => $features_supported_by_client ?? array(),
				'shipment_options'             => array(
					'label_date' => $label_date,
				),
				'is_return'                    => $is_return,
			)
		);

		if ( is_wp_error( $label_response ) ) {
			$error_data            = (array) $label_response->get_error_data();
			$error_data['success'] = false;
			$error_data['message'] = $label_response->get_error_message();

			$error = new WP_Error(
				$label_response->get_error_code(),
				$label_response->get_error_message(),
				$error_data
			);
			$this->logger->log( $error, __CLASS__ );
			return $error;
		}

		$purchased_labels_meta = $this->get_labels_meta_from_response( $label_response, $request_packages, $service_names, $order_id, $parent_shipment_id );

		if ( is_wp_error( $purchased_labels_meta ) ) {
			$this->logger->log( $purchased_labels_meta, __CLASS__ );
			return $purchased_labels_meta;
		}

		$selected_rate = array(
			'rate'             => array_merge(
				(array) $label_response->rates[0],
				array(
					'type' => $selected_rate['rate']['type'] ?? '',
				)
			),
			'parent'           => isset( $selected_rate['parent'] ) ? (array) $selected_rate['parent'] : null,
			'shipment_options' => $selected_rate_options,
		);

		$origin_address = array_merge(
			$origin,
			array(
				'id'          => $origin_address_id,
				'is_verified' => $is_origin_address_verified,
			),
		);

		$shipment_dates = array(
			'shipping_date'           => $label_date,
			'estimated_delivery_date' => null, // Coming soon
		);

		$hazmat_data = array_values( $hazmat )[0];

		$customs_data = array_values( $customs )[0];

		if ( Utils::should_use_fulfillment_api() && $fulfillment ) {
			return $this->store_purchased_label_to_fulfillment(
				$fulfillment,
				$purchased_labels_meta,
				$selected_rate,
				$hazmat_data,
				$origin_address,
				$destination,
				$customs_data,
				$shipment_dates
			);
		} else {
			$this->settings_store->add_labels_to_order( $order_id, $purchased_labels_meta );
		}

		// Trigger email notification for return labels.
		if ( $is_return ) {
			foreach ( $purchased_labels_meta as $label_meta ) {
				if ( ! empty( $label_meta['is_return'] ) && $label_meta['is_return'] ) {
					$attachments = array();

					// Try to get the PDF for attachment only if label is completed.
					if ( ! empty( $label_meta['label_id'] ) ) {
						// Check if label is ready (not in progress).
						if ( isset( $label_meta['status'] ) && 'PURCHASE_IN_PROGRESS' === $label_meta['status'] ) {
							// Schedule the email to be sent later when label is ready.
							if ( function_exists( 'as_schedule_single_action' ) ) {
								as_schedule_single_action(
									time() + 60, // Try again in 1 minute
									'wcshipping_send_return_label_email_delayed',
									array( $order_id, $label_meta ),
									'wcshipping'
								);
							} else {
								// Fallback to WP cron if Action Scheduler not available.
								wp_schedule_single_event(
									time() + 60,
									'wcshipping_send_return_label_email_delayed',
									array( $order_id, $label_meta )
								);
							}
						} else {
							// Label should be ready, try to get PDF.
							$pdf_attachment = $this->get_label_pdf_for_email( $label_meta['label_id'], $order_id );
							if ( ! is_wp_error( $pdf_attachment ) && ! empty( $pdf_attachment ) ) {
								$attachments[] = $pdf_attachment;
							}
						}
					}

					// Only send email now if label is not in progress.
					if ( ! isset( $label_meta['status'] ) || 'PURCHASE_IN_PROGRESS' !== $label_meta['status'] ) {
						/**
						 * Trigger return label email notification.
						 *
						 * @param int   $order_id The order ID.
						 * @param array $label_meta The label metadata.
						 * @param array $attachments Optional attachments.
						 */
						do_action( 'wcshipping_return_label_created', $order_id, $label_meta, $attachments );
					}

					// Don't clean up immediately - let the email system handle the file first.
					// Schedule cleanup for later.
					if ( ! empty( $attachments ) ) {
						foreach ( $attachments as $attachment ) {
							if ( function_exists( 'as_schedule_single_action' ) ) {
								as_schedule_single_action(
									time() + 300, // 5 minutes
									'wcshipping_cleanup_temp_file',
									array( $attachment ),
									'wcshipping'
								);
							} else {
								wp_schedule_single_event( time() + 300, 'wcshipping_cleanup_temp_file', array( $attachment ) );
							}
						}
					}
				}
			}
		}

		/**
		 * $hazmat looks like this:
		 * [
		 *   'shipment_0' => [
		 *     'category' => 'SOMECATEGORY'
		 *     'is_hazmat' => 'true'
		 *   ]
		 * ]
		 * so we can get the shipment key by getting the first key of the array
		 *
		 * @var string
		 */
		$shipment_key = array_keys( $hazmat )[0];

		$keyed_selected_rate = array(
			$shipment_key => $selected_rate,
		);

		$origin      = array(
			$shipment_key => $origin_address,
		);
		$destination = array(
			$shipment_key => $destination,
		);

		/**
		 * Extract package dimensions for storage.
		 *
		 * We store a snapshot of the current store units using `_snapshot` suffix fields.
		 * This distinguishes new (correct) data from legacy data where `package_weight_unit`
		 * was hardcoded to 'oz' regardless of the actual unit the value was stored in.
		 *
		 * Detection logic for frontend:
		 * - `_snapshot` fields exist: Trust them, value is in that unit
		 * - No `_snapshot` fields: Assume value is in current store unit
		 *   (Legacy `package_weight_unit` field is ignored as it was unreliable)
		 */
		$store_weight_unit    = strtolower( get_option( 'woocommerce_weight_unit', 'oz' ) );
		$store_dimension_unit = strtolower( get_option( 'woocommerce_dimension_unit', 'in' ) );

		$package_dimensions = array();
		foreach ( $packages as $index => $package ) {
			$dimensions_data = array();

			if ( isset( $package['weight'] ) ) {
				$dimensions_data['package_weight']               = $package['weight'];
				$dimensions_data['package_weight_unit_snapshot'] = $store_weight_unit;
			}

			if ( isset( $package['length'] ) || isset( $package['width'] ) || isset( $package['height'] ) ) {
				$dimensions_data['package_dimensions_unit_snapshot'] = $store_dimension_unit;
			}

			if ( isset( $package['length'] ) ) {
				$dimensions_data['package_length'] = $package['length'];
			}

			if ( isset( $package['width'] ) ) {
				$dimensions_data['package_width'] = $package['width'];
			}

			if ( isset( $package['height'] ) ) {
				$dimensions_data['package_height'] = $package['height'];
			}

			if ( ! empty( $dimensions_data ) ) {
				$package_dimensions[ $index ] = $dimensions_data;
			}
		}

		$selected_meta = $this->store_selected_meta(
			$order_id,
			array(
				self::SELECTED_RATES_KEY       => $keyed_selected_rate,
				self::SELECTED_HAZMAT_KEY      => $hazmat,
				self::SELECTED_ORIGIN_KEY      => $origin,
				self::SELECTED_DESTINATION_KEY => $destination,
				self::CUSTOMS_INFORMATION      => $customs,
				self::SHIPMENT_DATES           => array( $shipment_key => $shipment_dates ),
				self::PACKAGE_DIMENSIONS       => array(
					$shipment_key => $package_dimensions,
				),
			),
		);

		return array(
			'labels'               => $purchased_labels_meta,
			'selected_rates'       => $selected_meta[ self::SELECTED_RATES_KEY ],
			'selected_hazmat'      => $selected_meta[ self::SELECTED_HAZMAT_KEY ],
			'selected_origin'      => $selected_meta[ self::SELECTED_ORIGIN_KEY ],
			'selected_destination' => $selected_meta[ self::SELECTED_DESTINATION_KEY ],
			'customs_information'  => $selected_meta[ self::CUSTOMS_INFORMATION ],
			'shipment_dates'       => $selected_meta[ self::SHIPMENT_DATES ],
			'package_dimensions'   => $selected_meta[ self::PACKAGE_DIMENSIONS ],
			'success'              => true,
		);
	}

	/**
	 * Returns meta object for purchased labels to store with order.
	 *
	 * @param object $response           Purchase shipping label response from Connect Server.
	 * @param array  $packages          Packages for purchase label request body.
	 * @param array  $service_names     List of service names for packages.
	 * @param int    $order_id           WooCommerce order ID.
	 * @param string $parent_shipment_id For return labels: which shipment this is a return for.
	 * @return array|WP_Error Meta for purchased labels.
	 */
	private function get_labels_meta_from_response( $response, $packages, $service_names, $order_id, $parent_shipment_id = null ) {
		$label_ids             = array();
		$purchased_labels_meta = array();
		$package_lookup        = $this->settings_store->get_package_lookup();
		foreach ( $response->labels as $index => $label_data ) {

			if ( isset( $label_data->error ) ) {
				$error = new WP_Error(
					$label_data->error->code,
					$label_data->error->message,
					array(
						'success' => false,
						'message' => $label_data->error->message,
					)
				);
				return $error;
			}

			/*
			 * Aknowledge the error returned on label level.
			 * In this case, error is a string and a property of the individual label object.
			 *
			 * Example:
			 * $label_data->label->error = "Rate not found";
			 */
			if ( isset( $label_data->label->error ) ) {
				$error = new WP_Error(
					'purchase_error',
					$label_data->label->error,
					array(
						'success' => false,
						'message' => $label_data->label->error,
					)
				);
				return $error;
			}

			$label_ids[] = $label_data->label->label_id;

			$label_meta = array(
				'label_id'               => $label_data->label->label_id,
				'tracking'               => $label_data->label->tracking_id,
				'refundable_amount'      => $label_data->label->refundable_amount,
				'created'                => $label_data->label->created,
				'carrier_id'             => $label_data->label->carrier_id,
				'service_name'           => $service_names[ $index ],
				'status'                 => $label_data->label->status,
				'is_return'              => $label_data->label->is_return ?? false,
				'commercial_invoice_url' => $label_data->label->commercial_invoice_url ?? '',
				'is_commercial_invoice_submitted_electronically' => $label_data->label->is_commercial_invoice_submitted_electronically ?? '',
			);

			$package = $packages[ $index ];
			$box_id  = $package['box_id'];
			if ( 'custom_box' === $box_id ) {
				$label_meta['package_name'] = __( 'Individual packaging', 'woocommerce-shipping' );
			} elseif ( isset( $package_lookup[ $box_id ] ) ) {
				$label_meta['package_name'] = $package_lookup[ $box_id ]['name'];
			} else {
				$label_meta['package_name'] = __( 'Unknown package', 'woocommerce-shipping' );
			}

			$label_meta['is_letter'] = isset( $package['is_letter'] ) ? $package['is_letter'] : false;
			$product_names           = array();
			$product_ids             = array();
			foreach ( $package['products'] as $product_id ) {
				$product       = \wc_get_product( $product_id );
				$product_ids[] = $product_id;

				if ( $product ) {
					$product_names[] = $product->get_title();
				} else {
					$order           = \wc_get_order( $order_id );
					$product_names[] = WC_Connect_Utils::get_product_name_from_order( $product_id, $order );
				}
			}

			$label_meta['product_names'] = $product_names;
			$label_meta['product_ids']   = $product_ids;
			$label_meta['id']            = $package['id']; // internal shipment id.

			// Store parent shipment ID for return labels
			if ( null !== $parent_shipment_id && '' !== $parent_shipment_id ) {
				$label_meta['parent_shipment_id'] = $parent_shipment_id;
			}

			array_unshift( $purchased_labels_meta, $label_meta );
		}
		return $purchased_labels_meta;
	}

	/**
	 * Prepares packages request for Connect Server.
	 *
	 * @param array $packages Packages from purchase request.
	 * @return array Prepared packages request payload.
	 */
	private function prepare_packages_for_purchase( $packages ) {
		$last_box_id     = '';
		$last_service_id = '';
		$last_carrier_id = '';
		foreach ( $packages as $index => $package ) {
			unset( $package['service_name'] );
			$packages[ $index ] = $package;

			if ( empty( $last_box_id ) && ! empty( $package['box_id'] ) ) {
				$last_box_id = $package['box_id'];
			}

			if ( empty( $last_service_id ) && ! empty( $package['service_id'] ) ) {
				$last_service_id = $package['service_id'];
			}

			if ( empty( $last_carrier_id ) && ! empty( $package['carrier_id'] ) ) {
				$last_carrier_id = $package['carrier_id'];
			}
		}

		// Store most recently used box/service/carrier.
		if ( ! empty( $last_box_id ) ) {
			update_user_meta( get_current_user_id(), 'wcshipping_last_box_id', $last_box_id );
		}

		if ( ! empty( $last_service_id ) && '' !== $last_service_id ) {
			update_user_meta( get_current_user_id(), 'wcshipping_last_service_id', $last_service_id );
		}

		if ( ! empty( $last_carrier_id ) && '' !== $last_carrier_id ) {
			update_user_meta( get_current_user_id(), 'wcshipping_last_carrier_id', $last_carrier_id );
		}

		return $packages;
	}

	/**
	 * Store user meta.
	 *
	 * @param array $user_meta User meta array.
	 */
	public function update_user_meta( $user_meta ) {
		if ( empty( $user_meta ) ) {
			return;
		}
		foreach ( $user_meta as $key => $value ) {
			update_user_meta( get_current_user_id(), 'wcshipping_' . $key, $value );
		}
	}

	public function get_status( $label_id ) {
		return $this->api_client->get_label_status( $label_id );
	}

	public function update_order_label( int $order_id, $label_data ) {
		// Due to the async nature of the purchase process, we need to do the promotion decrement here, to only do it after the status changes to PURCHASED.

		if ( isset( $label_data->promo_id ) ) {
			$this->promo_service->maybe_decrement_promotion_remaining( $order_id, $label_data );
		}

		return $this->settings_store->update_label_order_meta_data( $order_id, $label_data );
	}

	/**
	 *
	 * @param $order_id int
	 * @param $selected_meta [
	 *    'selected_rate' => [],
	 *   'hazmat' => []
	 *   'origin' => []
	 *   'destination' => []
	 * ]
	 *
	 * @return array
	 */
	private function store_selected_meta( $order_id, $selected_meta ): array {
		$order = \wc_get_order( $order_id );
		foreach ( $selected_meta as $key => $value ) {
			$selected_state = $order->get_meta( $key );
			$selected_state = array_merge( empty( $selected_state ) ? array() : $selected_state, $value );
			$order->update_meta_data( $key, $selected_state );
		}
		$order->save();

		return $selected_meta;
	}

	/**
	 * @return object|WP_Error
	 */
	public function refund_label( int $order_id, int $label_id ) {
		$response = $this->api_client->send_shipping_label_refund_request( $label_id );

		if ( isset( $response->error ) ) {
			$response = new WP_Error(
				property_exists( $response->error, 'code' ) ? $response->error->code : 'refund_error',
				property_exists( $response->error, 'message' ) ? $response->error->message : ''
			);
		}

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$label_refund = (object) array(
			'label_id' => (int) $response->label->id,
			'refund'   => $response->refund,
		);

		$this->settings_store->update_label_order_meta_data( $order_id, $label_refund );

		return $response;
	}

	/**
	 * Get shipments destinations.
	 *
	 * @param int $order_id Order ID.
	 * @return array Array of destinations by shipment id.
	 */
	public function get_shipments_destinations( int $order_id ) {
		$order = \wc_get_order( $order_id );
		return $order->get_meta( self::SELECTED_DESTINATION_KEY );
	}

	/**
	 * Get shipments origins.
	 *
	 * @param int $order_id Order ID.
	 * @return array Array of origins by shipment id.
	 */
	public function get_shipments_origins( int $order_id ) {
		$order = \wc_get_order( $order_id );
		return $order->get_meta( self::SELECTED_ORIGIN_KEY );
	}


	/**
	 * Get shipments from order, build it from order items if only 1 shipment is present.
	 *
	 * Todo: refactor in  WOOSHIP-1603
	 *
	 * @param int $order_id Order ID.
	 * @return array Array of shipments.
	 */
	public function get_shipments( int $order_id ) {
		$order = \wc_get_order( $order_id );
		if ( ! $order instanceof \WC_Order ) {
			return array();
		}

		$shipments = $order->get_meta( self::ORDER_SHIPMENTS );
		// Single shipment orders does not have shipments meta set, so we build it from the order items
		if ( empty( $shipments ) ) {
			$shipments    = array();
			$shipments[0] = ShipmentsService::build_shipment_from_order_items( $order );
		}
		return $shipments;
	}

	/**
	 * Ensure the order has shipments.
	 *
	 * @param int $order_id Order ID.
	 * @return void
	 */
	private function ensure_order_has_shipments( $order_id ) {
		// If the order doesn't have shipments, create and store it
		$order = \wc_get_order( $order_id );
		if ( $order instanceof \WC_Order ) {
			$shipments = $order->get_meta( self::ORDER_SHIPMENTS );
			if ( empty( $shipments ) ) {
				$shipments    = array();
				$shipments[0] = ShipmentsService::build_shipment_from_order_items( $order );
				$order->update_meta_data( self::ORDER_SHIPMENTS, $shipments );
				$order->save();
			}
		}
	}

	/**
	 * Get label PDF as a temporary file for email attachment.
	 *
	 * @param int $label_id The label ID.
	 * @param int $order_id The order ID.
	 * @return string|WP_Error Path to temporary PDF file or error.
	 */
	private function get_label_pdf_for_email( $label_id, $order_id ) {
		// Get paper size with fallback.
		$paper_size = $this->settings_store->get_preferred_paper_size();
		if ( empty( $paper_size ) ) {
			$paper_size = 'letter'; // Default fallback.
		}

		// Prepare parameters for PDF request.
		$params = array(
			'paper_size' => $paper_size,
			'labels'     => array(
				array(
					'label_id' => intval( $label_id ),
				),
			),
		);

		// Get PDF from API.
		$response = $this->api_client->get_labels_print_pdf( $params );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		// Check if response has the expected format.
		if ( ! is_array( $response ) ) {
			return new WP_Error( 'invalid_pdf_response', __( 'Invalid PDF response format', 'woocommerce-shipping' ) );
		}

		// Extract the body from the response.
		$pdf_data = wp_remote_retrieve_body( $response );

		// Check if body contains PDF data.
		if ( empty( $pdf_data ) || substr( $pdf_data, 0, 4 ) !== '%PDF' ) {
			return new WP_Error( 'invalid_pdf_data', __( 'Response does not contain valid PDF data', 'woocommerce-shipping' ) );
		}

		// Create temporary file.
		$upload_dir = wp_upload_dir();
		$temp_dir   = trailingslashit( $upload_dir['basedir'] ) . 'wcshipping_temp/';

		// Create temp directory if it doesn't exist.
		if ( ! file_exists( $temp_dir ) ) {
			wp_mkdir_p( $temp_dir );
		}

		// Generate filename.
		$filename = sprintf( 'return-label-order-%d-label-%d.pdf', $order_id, $label_id );
		$filepath = $temp_dir . $filename;

		// Save PDF to temporary file.
		$result = file_put_contents( $filepath, $pdf_data );

		if ( false === $result ) {
			return new WP_Error( 'pdf_save_error', __( 'Failed to save PDF file', 'woocommerce-shipping' ) );
		}

		return $filepath;
	}

	/**
	 * Store purchased label data to fulfillment.
	 *
	 * @param ShippingFulfillment $fulfillment Fulfillment object instance.
	 * @param array               $purchased_labels_meta Array of purchased label metadata.
	 *                            Structure: [
	 *                                [
	 *                                    'label_id' => string,
	 *                                    'tracking' => string,
	 *                                    'refundable_amount' => float,
	 *                                    'created' => string (timestamp),
	 *                                    'carrier_id' => string,
	 *                                    'service_name' => string,
	 *                                    'status' => string,
	 *                                    'commercial_invoice_url' => string,
	 *                                    'is_commercial_invoice_submitted_electronically' => bool,
	 *                                    'package_name' => string,
	 *                                    'is_letter' => bool,
	 *                                    'product_names' => array of strings,
	 *                                    'product_ids' => array of integers,
	 *                                    'id' => string (internal shipment id)
	 *                                ],
	 *                                ...
	 *                            ]
	 * @param array               $selected_rate Selected shipping rate data.
	 *                            Structure: [
	 *                                'rate' => [
	 *                                    'id' => string,
	 *                                    'carrier_id' => string,
	 *                                    'service_id' => string,
	 *                                    'rate' => float,
	 *                                    'currency' => string,
	 *                                    'type' => string,
	 *                                    ...additional rate properties from API response
	 *                                ],
	 *                                'parent' => array|null (parent rate data if applicable),
	 *                                'shipment_options' => array (selected rate options)
	 *                            ]
	 * @param array               $hazmat_config HAZMAT configuration.
	 *                            Structure: [
	 *                                'category' => string (HAZMAT category),
	 *                                'is_hazmat' => string ('true'|'false')
	 *                            ]
	 * @param array               $origin_address Origin address data.
	 *                            Structure: [
	 *                                'id' => string (address ID),
	 *                                'is_verified' => bool,
	 *                                'name' => string,
	 *                                'company' => string,
	 *                                'address' => string,
	 *                                'address_2' => string,
	 *                                'city' => string,
	 *                                'state' => string,
	 *                                'postcode' => string,
	 *                                'country' => string,
	 *                                'phone' => string
	 *                            ]
	 * @param array               $destination Destination address data.
	 *                            Structure: [
	 *                                'name' => string,
	 *                                'company' => string,
	 *                                'address' => string,
	 *                                'address_2' => string,
	 *                                'city' => string,
	 *                                'state' => string,
	 *                                'postcode' => string,
	 *                                'country' => string,
	 *                                'phone' => string
	 *                            ]
	 * @param array               $customs Customs form information.
	 *                            Structure: [
	 *                                'contents_type' => string,
	 *                                'restriction_type' => string,
	 *                                'restriction_comments' => string,
	 *                                'non_delivery_option' => string,
	 *                                'customs_items' => [
	 *                                    [
	 *                                        'description' => string,
	 *                                        'quantity' => int,
	 *                                        'value' => float,
	 *                                        'weight' => float,
	 *                                        'hs_tariff_number' => string,
	 *                                        'origin_country' => string
	 *                                    ],
	 *                                    ...
	 *                                ]
	 *                            ]
	 * @param array               $shipment_dates Shipment date information.
	 *                            Structure: [
	 *                                'shipping_date' => string|null (label date),
	 *                                'estimated_delivery_date' => string|null (estimated delivery)
	 *                            ]
	 * @return array Response array with success status and stored data.
	 */
	private function store_purchased_label_to_fulfillment(
		$fulfillment,
		$purchased_labels_meta,
		$selected_rate,
		$hazmat_config,
		$origin_address,
		$destination,
		$customs,
		$shipment_dates
	) {
		// Set the fulfillment status to unfulfilled by default. It will be updated to fulfilled when the label is purchased.
		$fulfillment->set_status( 'unfulfilled' );
		$fulfillment->set_labels( $purchased_labels_meta );
		$fulfillment->set_shipping_label_rate( $selected_rate );
		$fulfillment->set_shipping_label_hazmat( $hazmat_config );
		$fulfillment->set_selected_origin( $origin_address );
		$fulfillment->set_shipping_label_destination( $destination );
		$fulfillment->set_shipping_label_customs( $customs );
		$fulfillment->set_shipping_label_dates( $shipment_dates );
		$fulfillment->save();

		return array_merge(
			$fulfillment->get_shipping_data(),
			array(
				'success' => true,
			)
		);
	}
}
