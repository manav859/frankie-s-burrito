<?php
/**
 * WooCommerce-backed food ordering endpoints for the headless frontend.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Frankies_Headless_Commerce {
	const REST_NAMESPACE = 'frankies/v1';
	const MENU_NAMESPACE = 'frankies-headless/v1';
	const CART_HEADER = 'x-frankies-cart-token';
	const CART_TTL = 604800;
	const MENU_CACHE_TTL = 600;
	const PRODUCT_META_NONCE = 'frankies_headless_product_meta_nonce';
	const CATEGORY_META_NONCE = 'frankies_headless_category_meta_nonce';
	const MENU_SEED_OPTION = 'frankies_headless_menu_seed_20260326';

	/**
	 * @var Frankies_Headless_Plugin
	 */
	private $plugin;

	/**
	 * @var Frankies_Headless_Api
	 */
	private $api;

	/**
	 * @var string
	 */
	private $last_menu_cache_status = 'miss';

	/**
	 * @var float
	 */
	private $last_menu_build_ms = 0.0;

	/**
	 * @var string
	 */
	private $last_menu_cache_key = '';

	public function __construct( Frankies_Headless_Plugin $plugin, Frankies_Headless_Api $api ) {
		$this->plugin = $plugin;
		$this->api    = $api;

		add_action( 'init', array( $this, 'register_meta' ) );
		add_action( 'admin_init', array( $this, 'maybe_seed_default_menu_catalog' ) );
		add_action( 'admin_notices', array( $this, 'render_menu_seed_notice' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
		add_action( 'woocommerce_product_options_general_product_data', array( $this, 'render_product_fields' ) );
		add_action( 'woocommerce_process_product_meta', array( $this, 'save_product_fields' ) );
		add_action( 'product_cat_add_form_fields', array( $this, 'render_category_add_fields' ) );
		add_action( 'product_cat_edit_form_fields', array( $this, 'render_category_edit_fields' ) );
		add_action( 'created_product_cat', array( $this, 'save_category_fields' ) );
		add_action( 'edited_product_cat', array( $this, 'save_category_fields' ) );
		add_action( 'save_post_product', array( $this, 'handle_content_change' ), 30, 0 );
		add_action( 'created_product_cat', array( $this, 'handle_content_change' ), 30, 0 );
		add_action( 'edited_product_cat', array( $this, 'handle_content_change' ), 30, 0 );
		add_action( 'woocommerce_before_calculate_totals', array( $this, 'apply_headless_cart_item_pricing' ), 20 );
		add_filter( 'woocommerce_get_item_data', array( $this, 'render_headless_cart_item_data' ), 10, 2 );
		add_action( 'woocommerce_checkout_create_order_line_item', array( $this, 'copy_headless_cart_item_meta_to_order' ), 10, 4 );
	}

	public static function activate() {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return;
		}

		flush_rewrite_rules();
	}

	public function register_meta() {
		$product_meta = array(
			'_frankies_card_description' => 'string',
			'_frankies_spice_levels'     => 'string',
			'_frankies_add_on_groups'    => 'string',
			'_frankies_allergens_enabled' => 'boolean',
			'_frankies_fulfillment_mode' => 'string',
			'_frankies_badge'            => 'string',
			'_frankies_availability'     => 'string',
			'_frankies_estimated_prep_minutes' => 'integer',
			'_frankies_featured_product' => 'boolean',
			'_frankies_featured_dark'    => 'boolean',
		);

		foreach ( $product_meta as $meta_key => $type ) {
			register_post_meta(
				'product',
				$meta_key,
				array(
					'single'            => true,
					'type'              => $type,
					'show_in_rest'      => false,
					'sanitize_callback' => 'boolean' === $type ? array( $this, 'sanitize_checkbox' ) : ( 'integer' === $type ? 'absint' : 'sanitize_textarea_field' ),
					'auth_callback'     => function() {
						return current_user_can( 'edit_products' ) || current_user_can( 'edit_posts' );
					},
				)
			);
		}

		foreach ( array( '_frankies_display_order', '_frankies_cta_label', '_frankies_image' ) as $meta_key ) {
			register_term_meta(
				'product_cat',
				$meta_key,
				array(
					'single'            => true,
					'type'              => '_frankies_display_order' === $meta_key ? 'integer' : 'string',
					'show_in_rest'      => false,
					'sanitize_callback' => '_frankies_display_order' === $meta_key ? 'absint' : ( '_frankies_image' === $meta_key ? 'esc_url_raw' : 'sanitize_text_field' ),
					'auth_callback'     => function() {
						return current_user_can( 'manage_product_terms' ) || current_user_can( 'manage_categories' );
					},
				)
			);
		}
	}

	public function register_rest_routes() {
		register_rest_route(
			self::MENU_NAMESPACE,
			'/menu',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_menu_v1' ),
				'permission_callback' => array( $this, 'allow_public_menu_request' ),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/menu/bootstrap',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_menu_bootstrap_v1' ),
				'permission_callback' => array( $this, 'allow_public_menu_request' ),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/menu/categories',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_menu_categories_v1' ),
				'permission_callback' => array( $this, 'allow_public_menu_request' ),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/menu/items',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_menu_items_v1' ),
				'permission_callback' => array( $this, 'allow_public_menu_request' ),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/menu/items/(?P<item>[\w-]+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_menu_item_v1' ),
				'permission_callback' => array( $this, 'allow_public_menu_request' ),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/cart',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_headless_cart' ),
				'permission_callback' => array( $this, 'allow_public_mutation_request' ),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/cart/add',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'rest_headless_cart_add' ),
				'permission_callback' => array( $this, 'allow_public_mutation_request' ),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/cart/update',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'rest_headless_cart_update' ),
				'permission_callback' => array( $this, 'allow_public_mutation_request' ),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/cart/remove',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'rest_headless_cart_remove' ),
				'permission_callback' => array( $this, 'allow_public_mutation_request' ),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/cart/clear',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'rest_headless_cart_clear' ),
				'permission_callback' => array( $this, 'allow_public_mutation_request' ),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/checkout/config',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'rest_headless_checkout_config' ),
					'permission_callback' => array( $this, 'allow_public_mutation_request' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'rest_headless_checkout_config' ),
					'permission_callback' => array( $this, 'allow_public_mutation_request' ),
				),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/checkout/validate',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'rest_headless_checkout_validate' ),
				'permission_callback' => array( $this, 'allow_public_mutation_request' ),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/checkout/place-order',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'rest_headless_checkout_place_order' ),
				'permission_callback' => array( $this, 'allow_public_mutation_request' ),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/delivery/validate',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'rest_headless_delivery_validate' ),
				'permission_callback' => array( $this, 'allow_public_mutation_request' ),
			)
		);

		register_rest_route(
			self::MENU_NAMESPACE,
			'/orders/(?P<order_id>\d+)/confirmation',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_headless_order_confirmation' ),
				'permission_callback' => array( $this, 'allow_public_order_confirmation_request' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/menu',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_menu' ),
				'permission_callback' => array( $this, 'allow_public_menu_request' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/menu/(?P<slug>[a-zA-Z0-9-_]+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_menu_item' ),
				'permission_callback' => array( $this, 'allow_public_menu_request' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/cart',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_cart' ),
				'permission_callback' => array( $this, 'allow_public_mutation_request' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/cart/items',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'rest_add_cart_item' ),
				'permission_callback' => array( $this, 'allow_public_mutation_request' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/cart/items/(?P<item_key>[a-zA-Z0-9-]+)',
			array(
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'rest_update_cart_item' ),
					'permission_callback' => array( $this, 'allow_public_mutation_request' ),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'rest_delete_cart_item' ),
					'permission_callback' => array( $this, 'allow_public_mutation_request' ),
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/checkout/options',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'rest_checkout_options' ),
				'permission_callback' => array( $this, 'allow_public_mutation_request' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/checkout',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'rest_checkout' ),
				'permission_callback' => array( $this, 'allow_public_mutation_request' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/orders/(?P<order_id>\d+)/confirmation',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'rest_order_confirmation' ),
				'permission_callback' => array( $this, 'allow_public_order_confirmation_request' ),
			)
		);
	}

	public function handle_content_change() {
		$this->log_event( 'info', 'Commerce content changed. Purging menu cache and triggering frontend revalidation.' );
		$this->plugin->purge_public_cache();
		$this->plugin->trigger_frontend_revalidation();
	}

	public function sanitize_checkbox( $value ) {
		return ! empty( $value );
	}

	public function allow_public_menu_request( WP_REST_Request $request ) {
		return true;
	}

	public function allow_public_mutation_request( WP_REST_Request $request ) {
		return true;
	}

	public function allow_public_order_confirmation_request( WP_REST_Request $request ) {
		return true;
	}

	private function sanitize_badge( $badge ) {
		$badge = sanitize_key( (string) $badge );
		return in_array( $badge, array( 'featured', 'popular' ), true ) ? $badge : '';
	}

	private function sanitize_availability( $availability ) {
		$availability = sanitize_key( (string) $availability );
		return in_array( $availability, array( 'available', 'unavailable' ), true ) ? $availability : 'available';
	}

	private function log_event( $level, $message, array $context = array() ) {
		if ( function_exists( 'wc_get_logger' ) ) {
			wc_get_logger()->log( $level, $message . ' ' . wp_json_encode( $context ), array( 'source' => 'frankies-headless' ) );
		}

		do_action( 'frankies_headless_log', $level, $message, $context );
	}

	public function maybe_seed_default_menu_catalog() {
		if ( get_option( self::MENU_SEED_OPTION ) ) {
			return;
		}

		if ( ! is_admin() || ! current_user_can( 'manage_woocommerce' ) || ! function_exists( 'wc_get_product_object' ) ) {
			return;
		}

		if ( empty( $_GET['frankies_seed_menu'] ) || '1' !== (string) $_GET['frankies_seed_menu'] ) {
			return;
		}

		check_admin_referer( 'frankies_seed_menu_catalog' );

		if ( ! class_exists( 'WC_Admin_Meta_Boxes' ) ) {
			return;
		}

		$catalog = $this->get_seed_menu_catalog();

		if ( empty( $catalog ) ) {
			return;
		}

		foreach ( $catalog as $category_index => $category ) {
			$term_id = $this->upsert_seed_category( $category, $category_index );

			if ( $term_id <= 0 ) {
				continue;
			}

			foreach ( $category['items'] as $item_index => $item ) {
				$this->upsert_seed_product( $term_id, $category, $item, $item_index );
			}
		}

		update_option( self::MENU_SEED_OPTION, gmdate( DATE_ATOM ), false );
		$this->log_event( 'info', 'Seeded Frankies menu catalog from the provided structured menu data.' );
		$this->handle_content_change();
		$this->maybe_add_admin_notice( 'Frankies menu catalog imported.' );
		wp_safe_redirect( remove_query_arg( array( 'frankies_seed_menu', '_wpnonce' ) ) );
		exit;
	}

	public function render_menu_seed_notice() {
		if ( get_option( self::MENU_SEED_OPTION ) || ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		$url = wp_nonce_url(
			add_query_arg( 'frankies_seed_menu', '1', admin_url( 'admin.php?page=wc-admin' ) ),
			'frankies_seed_menu_catalog'
		);

		echo '<div class="notice notice-info"><p>Frankies structured menu import is ready but will not run automatically. <a class="button button-primary" href="' . esc_url( $url ) . '">Import Menu Items</a></p></div>';
	}

	public function render_product_fields() {
		// Admin entry notes:
		// - use Woo's short description for card copy
		// - use Woo's main description for the detail page body
		// - keep spice/add-on JSON small and explicit because this is the API source of truth
		echo '<div class="options_group">';
		wp_nonce_field( self::PRODUCT_META_NONCE, self::PRODUCT_META_NONCE );
		echo '<p class="form-field"><strong>Headless Menu Settings</strong><br />These fields shape the API payload consumed by the React storefront. Keep Woo price, images, categories, and upsells in their normal WooCommerce fields.</p>';

		woocommerce_wp_checkbox(
			array(
				'id'          => '_frankies_featured_product',
				'label'       => 'Feature in menu cards',
				'description' => 'Used by the headless menu and homepage payloads. Admin note: use the Woo short description field for card copy.',
			)
		);

		woocommerce_wp_textarea_input(
			array(
				'id'          => '_frankies_card_description',
				'label'       => 'Card description override',
				'description' => 'Optional override for menu card copy. Leave blank to use the Woo short description.',
				'desc_tip'    => true,
			)
		);

		woocommerce_wp_select(
			array(
				'id'          => '_frankies_badge',
				'label'       => 'Badge',
				'options'     => array(
					''         => 'None',
					'featured' => 'Featured',
					'popular'  => 'Popular',
				),
				'value'       => get_post_meta( get_the_ID(), '_frankies_badge', true ),
				'description' => 'Single frontend badge. Use Featured or Popular.',
			)
		);

		woocommerce_wp_checkbox(
			array(
				'id'          => '_frankies_featured_dark',
				'label'       => 'Use dark featured card styling',
				'description' => 'Matches the existing homepage featured card variant.',
			)
		);

		woocommerce_wp_select(
			array(
				'id'          => '_frankies_fulfillment_mode',
				'label'       => 'Fulfillment mode',
				'options'     => array(
					'both'     => 'Pickup and delivery',
					'pickup'   => 'Pickup only',
					'delivery' => 'Delivery only',
				),
				'value'       => get_post_meta( get_the_ID(), '_frankies_fulfillment_mode', true ) ?: 'both',
				'description' => 'Controls whether the item can be ordered for pickup, delivery, or both.',
			)
		);

		woocommerce_wp_select(
			array(
				'id'          => '_frankies_availability',
				'label'       => 'Availability',
				'options'     => array(
					'available'   => 'Available',
					'unavailable' => 'Unavailable',
				),
				'value'       => get_post_meta( get_the_ID(), '_frankies_availability', true ) ?: 'available',
				'description' => 'Use Unavailable to hide ordering without unpublishing the product.',
			)
		);

		woocommerce_wp_text_input(
			array(
				'id'                => '_frankies_estimated_prep_minutes',
				'label'             => 'Estimated prep minutes',
				'type'              => 'number',
				'custom_attributes' => array(
					'min'  => 0,
					'step' => 1,
				),
				'description'       => 'Optional per-item prep estimate. Used operationally and as a signal for estimated ready time.',
				'desc_tip'          => true,
			)
		);

		woocommerce_wp_text_input(
			array(
				'id'                => '_frankies_menu_sort_order',
				'label'             => 'Menu sort order',
				'type'              => 'number',
				'value'             => (string) get_post_field( 'menu_order', get_the_ID() ),
				'custom_attributes' => array(
					'step' => 1,
				),
				'description'       => 'Maps to the product menu order used by the headless menu APIs within category listings.',
				'desc_tip'          => true,
			)
		);

		woocommerce_wp_textarea_input(
			array(
				'id'          => '_frankies_spice_levels',
				'label'       => 'Spice levels JSON',
				'description' => 'Example: [{"key":"mild","label":"Mild","price_adjustment":"0"},{"key":"medium-jalapeno","label":"Medium (Jalapeno)","price_adjustment":"0"}]. Admin note: this is a radio-style single choice.',
				'desc_tip'    => true,
			)
		);

		woocommerce_wp_textarea_input(
			array(
				'id'          => '_frankies_add_on_groups',
				'label'       => 'Add-ons JSON',
				'description' => 'Example: [{"key":"extras","label":"Add-ons","type":"checkbox","min":0,"max":4,"options":[{"key":"guac","label":"Guac","price_adjustment":"2.00"}]}]',
				'desc_tip'    => true,
			)
		);

		woocommerce_wp_checkbox(
			array(
				'id'          => '_frankies_allergens_enabled',
				'label'       => 'Collect allergies note',
				'description' => 'When enabled, the storefront prompts for allergy or dietary instructions before adding the item to cart.',
			)
		);

		echo '</div>';
	}

	public function save_product_fields( $product_id ) {
		$product_id = (int) $product_id;

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		if ( empty( $_POST[ self::PRODUCT_META_NONCE ] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[ self::PRODUCT_META_NONCE ] ) ), self::PRODUCT_META_NONCE ) ) {
			return;
		}

		if ( ! current_user_can( 'edit_post', $product_id ) ) {
			return;
		}

		$menu_sort_order = (int) wp_unslash( $_POST['_frankies_menu_sort_order'] ?? get_post_field( 'menu_order', $product_id ) );
		$card_description = sanitize_textarea_field( wp_unslash( $_POST['_frankies_card_description'] ?? '' ) );
		$estimated_prep_minutes = absint( wp_unslash( $_POST['_frankies_estimated_prep_minutes'] ?? 0 ) );
		$spice_levels_raw = wp_unslash( $_POST['_frankies_spice_levels'] ?? '' );
		$add_on_groups_raw = wp_unslash( $_POST['_frankies_add_on_groups'] ?? '' );
		$spice_levels = $this->sanitize_spice_levels( $spice_levels_raw );
		$add_on_groups = $this->sanitize_add_on_groups( $add_on_groups_raw );

		update_post_meta( $product_id, '_frankies_featured_product', ! empty( $_POST['_frankies_featured_product'] ) ? 'yes' : '' );
		update_post_meta( $product_id, '_frankies_card_description', $card_description );
		update_post_meta( $product_id, '_frankies_badge', $this->sanitize_badge( wp_unslash( $_POST['_frankies_badge'] ?? '' ) ) );
		update_post_meta( $product_id, '_frankies_featured_dark', ! empty( $_POST['_frankies_featured_dark'] ) ? 'yes' : '' );
		update_post_meta( $product_id, '_frankies_fulfillment_mode', $this->sanitize_fulfillment_mode( wp_unslash( $_POST['_frankies_fulfillment_mode'] ?? 'both' ) ) );
		update_post_meta( $product_id, '_frankies_availability', $this->sanitize_availability( wp_unslash( $_POST['_frankies_availability'] ?? 'available' ) ) );
		update_post_meta( $product_id, '_frankies_estimated_prep_minutes', $estimated_prep_minutes );
		update_post_meta( $product_id, '_frankies_spice_levels', wp_json_encode( $spice_levels ) );
		update_post_meta( $product_id, '_frankies_add_on_groups', wp_json_encode( $add_on_groups ) );
		update_post_meta( $product_id, '_frankies_allergens_enabled', ! empty( $_POST['_frankies_allergens_enabled'] ) ? 'yes' : '' );
		$this->maybe_report_invalid_structured_meta( $product_id, '_frankies_spice_levels', $spice_levels_raw, $spice_levels );
		$this->maybe_report_invalid_structured_meta( $product_id, '_frankies_add_on_groups', $add_on_groups_raw, $add_on_groups );

		global $wpdb;
		$wpdb->update(
			$wpdb->posts,
			array( 'menu_order' => $menu_sort_order ),
			array( 'ID' => $product_id ),
			array( '%d' ),
			array( '%d' )
		);
		clean_post_cache( $product_id );

		if ( empty( get_post_thumbnail_id( $product_id ) ) ) {
			$this->log_event( 'warning', 'Product saved without featured image.', array( 'product_id' => $product_id ) );
		}

		if ( '' === $card_description && '' === trim( (string) get_post_field( 'post_excerpt', $product_id ) ) ) {
			$this->log_event( 'warning', 'Product saved without a card description or Woo short description.', array( 'product_id' => $product_id ) );
		}
	}

	public function render_category_add_fields() {
		?>
		<?php wp_nonce_field( self::CATEGORY_META_NONCE, self::CATEGORY_META_NONCE ); ?>
		<div class="form-field">
			<label for="frankies-product-cat-display-order">Display order</label>
			<input type="number" name="frankies_product_cat_display_order" id="frankies-product-cat-display-order" value="0" />
			<p>Used for sidebar and tab ordering in the headless menu APIs.</p>
		</div>
		<div class="form-field">
			<label for="frankies-product-cat-cta-label">CTA label</label>
			<input type="text" name="frankies_product_cat_cta_label" id="frankies-product-cat-cta-label" value="" />
			<p>Optional CTA label for category-specific menu promos.</p>
		</div>
		<div class="form-field">
			<label for="frankies-product-cat-image">Image URL override</label>
			<input type="url" name="frankies_product_cat_image" id="frankies-product-cat-image" value="" />
			<p>Optional. Leave blank to fall back to the WooCommerce category thumbnail.</p>
		</div>
		<?php
	}

	public function render_category_edit_fields( WP_Term $term ) {
		?>
		<?php wp_nonce_field( self::CATEGORY_META_NONCE, self::CATEGORY_META_NONCE ); ?>
		<tr class="form-field">
			<th scope="row"><label for="frankies-product-cat-display-order">Display order</label></th>
			<td><input type="number" name="frankies_product_cat_display_order" id="frankies-product-cat-display-order" value="<?php echo esc_attr( (string) get_term_meta( $term->term_id, '_frankies_display_order', true ) ); ?>" /><p class="description">Used for sidebar and tab ordering in the headless menu APIs.</p></td>
		</tr>
		<tr class="form-field">
			<th scope="row"><label for="frankies-product-cat-cta-label">CTA label</label></th>
			<td><input type="text" name="frankies_product_cat_cta_label" id="frankies-product-cat-cta-label" value="<?php echo esc_attr( (string) get_term_meta( $term->term_id, '_frankies_cta_label', true ) ); ?>" /><p class="description">Optional CTA label for category-specific menu promos.</p></td>
		</tr>
		<tr class="form-field">
			<th scope="row"><label for="frankies-product-cat-image">Image URL override</label></th>
			<td><input type="url" name="frankies_product_cat_image" id="frankies-product-cat-image" value="<?php echo esc_attr( (string) get_term_meta( $term->term_id, '_frankies_image', true ) ); ?>" class="regular-text" /><p class="description">Optional. Leave blank to fall back to the WooCommerce category thumbnail.</p></td>
		</tr>
		<?php
	}

	public function save_category_fields( $term_id ) {
		if ( empty( $_POST[ self::CATEGORY_META_NONCE ] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST[ self::CATEGORY_META_NONCE ] ) ), self::CATEGORY_META_NONCE ) ) {
			return;
		}

		update_term_meta( $term_id, '_frankies_display_order', absint( $_POST['frankies_product_cat_display_order'] ?? 0 ) );
		update_term_meta( $term_id, '_frankies_cta_label', sanitize_text_field( wp_unslash( $_POST['frankies_product_cat_cta_label'] ?? '' ) ) );
		update_term_meta( $term_id, '_frankies_image', esc_url_raw( wp_unslash( $_POST['frankies_product_cat_image'] ?? '' ) ) );

		if ( '' === (string) get_term_meta( $term_id, '_frankies_image', true ) && ! get_term_meta( $term_id, 'thumbnail_id', true ) ) {
			$this->log_event( 'info', 'Product category saved without an image override or thumbnail.', array( 'term_id' => $term_id ) );
		}
	}

	private function maybe_report_invalid_structured_meta( $product_id, $field, $raw, array $sanitized ) {
		$raw = trim( (string) $raw );

		if ( '' === $raw ) {
			return;
		}

		$decoded = json_decode( $raw, true );
		$json_error = json_last_error();
		$sanitized_json = wp_json_encode( $sanitized );

		if ( JSON_ERROR_NONE !== $json_error ) {
			$message = sprintf( 'Invalid JSON provided for %s on product %d. The field was saved as an empty array.', $field, $product_id );
			$this->log_event( 'warning', $message, array( 'product_id' => $product_id, 'field' => $field ) );
			$this->maybe_add_admin_error( $message );
			return;
		}

		if ( wp_json_encode( $decoded ) !== $sanitized_json ) {
			$message = sprintf( 'Structured menu data for %s on product %d was sanitized before saving.', $field, $product_id );
			$this->log_event( 'info', $message, array( 'product_id' => $product_id, 'field' => $field ) );
			$this->maybe_add_admin_notice( $message );
		}
	}

	private function maybe_add_admin_error( $message ) {
		if ( class_exists( 'WC_Admin_Meta_Boxes' ) && method_exists( 'WC_Admin_Meta_Boxes', 'add_error' ) ) {
			WC_Admin_Meta_Boxes::add_error( $message );
			return;
		}

		if ( class_exists( 'WC_Admin_Settings' ) && method_exists( 'WC_Admin_Settings', 'add_error' ) ) {
			WC_Admin_Settings::add_error( $message );
		}
	}

	private function maybe_add_admin_notice( $message ) {
		if ( class_exists( 'WC_Admin_Meta_Boxes' ) && method_exists( 'WC_Admin_Meta_Boxes', 'add_message' ) ) {
			WC_Admin_Meta_Boxes::add_message( $message );
			return;
		}

		if ( class_exists( 'WC_Admin_Settings' ) && method_exists( 'WC_Admin_Settings', 'add_message' ) ) {
			WC_Admin_Settings::add_message( $message );
		}
	}

	private function get_seed_menu_catalog() {
		return array(
			array(
				'slug' => 'breakfast-more',
				'name' => 'Breakfast & More',
				'description' => 'Morning burritos and breakfast-forward favorites.',
				'prep_minutes' => 15,
				'items' => array(
					array(
						'name' => 'Smoky Rooster',
						'slug' => 'smoky-rooster',
						'price' => '9.00',
						'short_description' => 'Smoky flavored burrito with grilled chicken and savory mix-ins.',
						'description' => 'Smoky flavored burrito with grilled chicken and savory mix-ins.',
						'badge' => 'popular',
					),
					array(
						'name' => 'Sunset',
						'slug' => 'sunset',
						'price' => '9.00',
						'short_description' => 'Balanced breakfast burrito with fresh veggies and protein.',
						'description' => 'Balanced breakfast burrito with fresh veggies and protein.',
					),
					array(
						'name' => 'Pubby Stin',
						'slug' => 'pubby-stin',
						'price' => '9.00',
						'short_description' => 'Hearty breakfast option with rich fillings.',
						'description' => 'Hearty breakfast option with rich fillings. Name was taken from the provided structured menu and should be verified in admin if needed.',
					),
					array(
						'name' => 'A-Town Charger',
						'slug' => 'a-town-charger',
						'price' => '10.00',
						'short_description' => 'Loaded burrito with bold flavors, meats, and crispy elements.',
						'description' => 'Loaded burrito with bold flavors, meats, and crispy elements.',
						'badge' => 'featured',
					),
					array(
						'name' => 'Lemon Sater',
						'slug' => 'lemon-sater',
						'price' => '8.00',
						'short_description' => 'Light, zesty burrito with cheese and citrus-style flavor.',
						'description' => 'Light, zesty burrito with cheese and citrus-style flavor. Name was taken from the provided structured menu and should be verified in admin if needed.',
					),
				),
			),
			array(
				'slug' => 'lunch-more',
				'name' => 'Lunch & More',
				'description' => 'Larger midday burritos with bold fillings.',
				'prep_minutes' => 20,
				'items' => array(
					array(
						'name' => 'Malibu Sun',
						'slug' => 'malibu-sun',
						'price' => '11.00',
						'short_description' => 'Southwestern-style burrito with fresh veggies and cheese.',
						'description' => 'Southwestern-style burrito with fresh veggies and cheese.',
					),
					array(
						'name' => 'SW Supreme',
						'slug' => 'sw-supreme',
						'price' => '12.00',
						'short_description' => 'Loaded southwest burrito with bold spices and toppings.',
						'description' => 'Loaded southwest burrito with bold spices and toppings.',
						'badge' => 'popular',
					),
					array(
						'name' => 'The Hawk',
						'slug' => 'the-hawk',
						'price' => '12.00',
						'short_description' => 'Chicken-based burrito with crispy tots and savory sauces.',
						'description' => 'Chicken-based burrito with crispy tots and savory sauces.',
						'badge' => 'featured',
					),
					array(
						'name' => 'The Hawk (Alt)',
						'slug' => 'the-hawk-alt',
						'price' => '12.00',
						'short_description' => 'Variation with southwestern flavors and extra fillings.',
						'description' => 'Variation with southwestern flavors and extra fillings.',
					),
					array(
						'name' => 'The Cielo',
						'slug' => 'the-cielo',
						'price' => '13.00',
						'short_description' => 'Premium burrito with elevated ingredients and flavor.',
						'description' => 'Premium burrito with elevated ingredients and flavor.',
						'badge' => 'featured',
					),
				),
			),
			array(
				'slug' => 'kids',
				'name' => 'Kids',
				'description' => 'Kid-friendly portions and simpler plates.',
				'prep_minutes' => 10,
				'items' => array(
					array(
						'name' => 'Kids Burritos',
						'slug' => 'kids-burritos',
						'price' => '6.00',
						'short_description' => 'Simple, smaller burritos for kids.',
						'description' => 'Simple, smaller burritos for kids.',
					),
					array(
						'name' => 'Quesadillas',
						'slug' => 'quesadillas',
						'price' => '6.00',
						'short_description' => 'Cheesy grilled tortilla snack.',
						'description' => 'Cheesy grilled tortilla snack.',
					),
					array(
						'name' => 'Pancakes',
						'slug' => 'pancakes',
						'price' => '7.00',
						'short_description' => 'Soft, fluffy pancakes for a sweet option.',
						'description' => 'Soft, fluffy pancakes for a sweet option.',
					),
				),
			),
			array(
				'slug' => 'sides',
				'name' => 'Sides',
				'description' => 'Snackable extras and shareable savory sides.',
				'prep_minutes' => 8,
				'items' => array(
					array(
						'name' => 'Cracked Tots',
						'slug' => 'cracked-tots',
						'price' => '5.00',
						'short_description' => 'Classic crispy tater tots.',
						'description' => 'Classic crispy tater tots.',
					),
					array(
						'name' => 'Black Truffle Tots',
						'slug' => 'black-truffle-tots',
						'price' => '7.00',
						'short_description' => 'Tots infused with truffle flavor.',
						'description' => 'Tots infused with truffle flavor.',
						'badge' => 'popular',
					),
					array(
						'name' => 'Loaded Tots',
						'slug' => 'loaded-tots',
						'price' => '8.00',
						'short_description' => 'Topped with cheese, sauces, and extras.',
						'description' => 'Topped with cheese, sauces, and extras.',
					),
					array(
						'name' => 'Chips & Dips',
						'slug' => 'chips-and-dips',
						'price' => '6.00',
						'short_description' => 'Crunchy chips served with flavorful dips.',
						'description' => 'Crunchy chips served with flavorful dips.',
					),
				),
			),
			array(
				'slug' => 'drinks',
				'name' => 'Drinks',
				'description' => 'House beverages and refreshing drinks.',
				'prep_minutes' => 2,
				'items' => array(
					array(
						'name' => 'Horchata',
						'slug' => 'horchata',
						'price' => '4.00',
						'short_description' => 'Sweet rice-based Mexican drink.',
						'description' => 'Sweet rice-based Mexican drink.',
					),
					array(
						'name' => 'Jamaica',
						'slug' => 'jamaica',
						'price' => '4.00',
						'short_description' => 'Hibiscus tea, refreshing and tangy.',
						'description' => 'Hibiscus tea, refreshing and tangy.',
					),
					array(
						'name' => 'Frescas',
						'slug' => 'frescas',
						'price' => '4.00',
						'short_description' => 'Light fruit-based drinks.',
						'description' => 'Light fruit-based drinks.',
					),
					array(
						'name' => 'Fresh Juices',
						'slug' => 'fresh-juices',
						'price' => '5.00',
						'short_description' => 'Freshly squeezed juices.',
						'description' => 'Freshly squeezed juices.',
					),
					array(
						'name' => 'Specialist Sodas',
						'slug' => 'specialist-sodas',
						'price' => '5.00',
						'short_description' => 'Craft or specialty sodas.',
						'description' => 'Craft or specialty sodas.',
					),
				),
			),
			array(
				'slug' => 'desserts',
				'name' => 'Desserts',
				'description' => 'Sweet finishes and baked treats.',
				'prep_minutes' => 5,
				'items' => array(
					array(
						'name' => 'Cinnamon Rolls',
						'slug' => 'cinnamon-rolls',
						'price' => '6.00',
						'short_description' => 'Warm, sweet rolls with cinnamon glaze.',
						'description' => 'Warm, sweet rolls with cinnamon glaze.',
					),
					array(
						'name' => 'House-made Cookies',
						'slug' => 'house-made-cookies',
						'price' => '3.00',
						'short_description' => 'Fresh baked cookies.',
						'description' => 'Fresh baked cookies.',
					),
				),
			),
			array(
				'slug' => 'catering',
				'name' => 'Catering',
				'description' => 'Larger-format bundles for group ordering.',
				'prep_minutes' => 60,
				'items' => array(
					array(
						'name' => 'Fiesta Pack',
						'slug' => 'fiesta-pack',
						'price' => '150.00',
						'short_description' => 'Basic catering package for small groups.',
						'description' => 'Basic catering package for small groups.',
					),
					array(
						'name' => 'Premium Pack',
						'slug' => 'premium-pack',
						'price' => '200.00',
						'short_description' => 'Expanded catering with more variety.',
						'description' => 'Expanded catering with more variety.',
						'badge' => 'popular',
					),
					array(
						'name' => 'Premier Pack',
						'slug' => 'premier-pack',
						'price' => '250.00',
						'short_description' => 'Full catering experience with premium options.',
						'description' => 'Full catering experience with premium options.',
						'badge' => 'featured',
					),
				),
			),
		);
	}

	private function upsert_seed_category( array $category, $category_index ) {
		$existing = get_term_by( 'slug', $category['slug'], 'product_cat' );

		if ( ! $existing || is_wp_error( $existing ) ) {
			$created = wp_insert_term(
				$category['name'],
				'product_cat',
				array(
					'slug' => $category['slug'],
					'description' => $category['description'],
				)
			);

			if ( is_wp_error( $created ) ) {
				$this->log_event( 'error', 'Unable to create seed product category.', array( 'category' => $category['slug'], 'error' => $created->get_error_message() ) );
				return 0;
			}

			$term_id = (int) $created['term_id'];
		} else {
			$term_id = (int) $existing->term_id;
		}

		update_term_meta( $term_id, '_frankies_display_order', $category_index + 1 );
		update_term_meta( $term_id, '_frankies_cta_label', $category['name'] );

		return $term_id;
	}

	private function upsert_seed_product( $term_id, array $category, array $item, $item_index ) {
		$existing = get_page_by_path( $item['slug'], OBJECT, 'product' );

		if ( $existing instanceof WP_Post ) {
			return (int) $existing->ID;
		}

		$product = wc_get_product_object( 'simple' );

		if ( ! $product instanceof WC_Product_Simple ) {
			return 0;
		}

		$product->set_name( $item['name'] );
		$product->set_slug( $item['slug'] );
		$product->set_status( 'publish' );
		$product->set_catalog_visibility( 'visible' );
		$product->set_regular_price( $item['price'] );
		$product->set_price( $item['price'] );
		$product->set_description( $item['description'] );
		$product->set_short_description( $item['short_description'] );
		$product->set_menu_order( $item_index + 1 );
		$product->set_category_ids( array( (int) $term_id ) );
		$product_id = $product->save();

		if ( ! $product_id ) {
			$this->log_event( 'error', 'Unable to create seed menu product.', array( 'product' => $item['slug'] ) );
			return 0;
		}

		update_post_meta( $product_id, '_frankies_card_description', $item['short_description'] );
		update_post_meta( $product_id, '_frankies_badge', $this->sanitize_badge( $item['badge'] ?? '' ) );
		update_post_meta( $product_id, '_frankies_availability', 'available' );
		update_post_meta( $product_id, '_frankies_fulfillment_mode', 'both' );
		update_post_meta( $product_id, '_frankies_estimated_prep_minutes', absint( $category['prep_minutes'] ?? 15 ) );
		update_post_meta( $product_id, '_frankies_featured_product', ! empty( $item['badge'] ) ? 'yes' : '' );
		update_post_meta( $product_id, '_frankies_featured_dark', '' );
		update_post_meta( $product_id, '_frankies_spice_levels', wp_json_encode( array() ) );
		update_post_meta( $product_id, '_frankies_add_on_groups', wp_json_encode( array() ) );
		wp_set_object_terms( $product_id, array( (int) $term_id ), 'product_cat', false );

		return (int) $product_id;
	}

	public function get_featured_products_payload( $preview = false ) {
		$products = wc_get_products(
			array(
				'status' => $preview ? array( 'publish', 'draft', 'private', 'pending' ) : array( 'publish' ),
				'limit'  => 6,
				'meta_query' => array(
					array(
						'key'   => '_frankies_featured_product',
						'value' => 'yes',
					),
				),
				'orderby' => 'menu_order',
				'order'   => 'ASC',
			)
		);

		return array_map(
			function( $product ) {
				$card = $this->api->map_product_card( $product );

				return array(
					'name'        => $card['name'],
					'description' => $card['short_description'],
					'price'       => $card['formatted_price'],
					'image'       => $card['image'],
					'imageAlt'    => $card['image_alt'],
					'dark'        => $card['dark'],
					'orderUrl'    => '/menu/' . $card['slug'],
				);
			},
			$products
		);
	}

	public function get_menu_sections_payload( $preview = false ) {
		$terms = $this->get_product_categories();
		$sections = array();

		foreach ( $terms as $term ) {
			$products = $this->get_products_for_category( $term->term_id, $preview );
			$term_summary = $this->api->map_term_summary( $term );

			$sections[] = array(
				'title'    => $term->name,
				'image'    => $term_summary['image'],
				'cta_label' => $term_summary['cta_label'],
				'items'    => array_map(
					function( $product ) {
						$price = $this->api->format_money( $product->get_price() );
						return trim( $product->get_name() . ' - ' . $price['formatted'] );
					},
					$products
				),
			);
		}

		return $sections;
	}

	public function rest_menu( WP_REST_Request $request ) {
		$preview = current_user_can( 'edit_products' ) && '1' === $request->get_param( 'preview' );
		$terms = $this->get_product_categories();
		$sections = array();

		foreach ( $terms as $term ) {
			$products = $this->get_products_for_category( $term->term_id, $preview );
			$sections[] = array(
				'category' => $this->api->map_term_summary( $term ),
				'items'    => array_map( array( $this->api, 'map_product_card' ), $products ),
			);
		}

		return new WP_REST_Response(
			array(
				'generatedAt' => gmdate( DATE_ATOM ),
				'categories'  => array_map( array( $this->api, 'map_term_summary' ), $terms ),
				'sections'    => $sections,
				'featured'    => $this->get_featured_products_payload( $preview ),
			)
		);
	}

	public function rest_menu_v1( WP_REST_Request $request ) {
		$params = $this->sanitize_menu_query_params( $request );
		$cache_key = 'menu:v2:' . md5( wp_json_encode( $params ) );

		$data = $this->get_cached_menu_payload(
			$cache_key,
			function() use ( $params ) {
				return $this->build_menu_payload_v1( $params );
			}
		);

		return $this->finalize_public_menu_response( $data );
	}

	public function rest_menu_categories_v1( WP_REST_Request $request ) {
		$data = $this->get_cached_menu_payload(
			'menu:categories',
			function() {
				return $this->build_menu_categories_payload_v1();
			}
		);

		return $this->finalize_public_menu_response( $data );
	}

	public function rest_menu_items_v1( WP_REST_Request $request ) {
		$params = $this->sanitize_menu_query_params( $request );
		$cache_key = 'menu:items:v2:' . md5( wp_json_encode( $params ) );

		$data = $this->get_cached_menu_payload(
			$cache_key,
			function() use ( $params ) {
				return $this->build_menu_items_payload_v1( $params );
			}
		);

		return $this->finalize_public_menu_response( $data );
	}

	public function rest_menu_item_v1( WP_REST_Request $request ) {
		$item = sanitize_text_field( (string) $request['item'] );
		$cache_key = 'menu:item:v2:' . md5( $item );

		$data = $this->get_cached_menu_payload(
			$cache_key,
			function() use ( $item ) {
				return $this->build_menu_item_payload_v1( $item );
			}
		);

		if ( is_wp_error( $data ) ) {
			return $data;
		}

		return $this->finalize_public_menu_response( $data );
	}

	public function rest_menu_bootstrap_v1( WP_REST_Request $request ) {
		$params = $this->sanitize_menu_query_params( $request );
		$cache_key = 'menu:bootstrap:v2:' . md5( wp_json_encode( $params ) );

		$data = $this->get_cached_menu_payload(
			$cache_key,
			function() use ( $params ) {
				return $this->build_menu_bootstrap_payload_v1( $params );
			}
		);

		return $this->finalize_public_menu_response( $data );
	}

	public function rest_headless_cart( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, true );
		$cart = $this->get_headless_storage_cart( $token );

		return rest_ensure_response( $this->build_headless_storage_cart_payload( $token, $cart ) );
	}

	public function rest_headless_cart_add( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, true );
		$cart = $this->get_headless_storage_cart( $token );
		$payload = $request->get_json_params() ?: $request->get_params();
		$item = $this->validate_headless_cart_request_item( $payload );

		if ( is_wp_error( $item ) ) {
			return $item;
		}

		$cart['items'][] = array(
			'key'          => wp_generate_uuid4(),
			'product_id'   => $item['product_id'],
			'quantity'     => $item['quantity'],
			'spice_option' => $item['spice_option'],
			'addons'       => $item['addons'],
			'allergies_note' => $item['allergies_note'],
		);
		$this->save_headless_storage_cart( $token, $cart );

		return rest_ensure_response( $this->build_headless_storage_cart_payload( $token, $cart ) );
	}

	public function rest_headless_cart_update( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, false );
		$cart = $this->get_headless_storage_cart( $token );
		$payload = $request->get_json_params() ?: $request->get_params();
		$item_key = sanitize_text_field( (string) ( $payload['key'] ?? '' ) );
		$quantity = max( 0, absint( $payload['quantity'] ?? 1 ) );

		if ( '' === $item_key ) {
			return new WP_Error( 'frankies_cart_missing_key', 'Cart item key is required.', array( 'status' => 422 ) );
		}

		$found = false;
		foreach ( $cart['items'] as $index => $item ) {
			if ( $item_key !== ( $item['key'] ?? '' ) ) {
				continue;
			}

			$found = true;
			if ( 0 === $quantity ) {
				unset( $cart['items'][ $index ] );
			} else {
				$cart['items'][ $index ]['quantity'] = $quantity;
			}
			break;
		}

		if ( ! $found ) {
			return new WP_Error( 'frankies_cart_item_not_found', 'Cart item not found.', array( 'status' => 404 ) );
		}

		$cart['items'] = array_values( $cart['items'] );
		$this->save_headless_storage_cart( $token, $cart );

		return rest_ensure_response( $this->build_headless_storage_cart_payload( $token, $cart ) );
	}

	public function rest_headless_cart_remove( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, false );
		$cart = $this->get_headless_storage_cart( $token );
		$payload = $request->get_json_params() ?: $request->get_params();
		$item_key = sanitize_text_field( (string) ( $payload['key'] ?? '' ) );

		if ( '' === $item_key ) {
			return new WP_Error( 'frankies_cart_missing_key', 'Cart item key is required.', array( 'status' => 422 ) );
		}

		$filtered = array_values(
			array_filter(
				$cart['items'],
				function( $item ) use ( $item_key ) {
					return $item_key !== ( $item['key'] ?? '' );
				}
			)
		);

		if ( count( $filtered ) === count( $cart['items'] ) ) {
			return new WP_Error( 'frankies_cart_item_not_found', 'Cart item not found.', array( 'status' => 404 ) );
		}

		$cart['items'] = $filtered;
		$this->save_headless_storage_cart( $token, $cart );

		return rest_ensure_response( $this->build_headless_storage_cart_payload( $token, $cart ) );
	}

	public function rest_headless_cart_clear( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, false );
		$cart = array( 'items' => array() );
		$this->save_headless_storage_cart( $token, $cart );

		return rest_ensure_response( $this->build_headless_storage_cart_payload( $token, $cart ) );
	}

	public function rest_headless_checkout_config( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, true );
		$params = $request->get_json_params() ?: $request->get_params();
		$cart = $this->resolve_headless_checkout_cart( $token, is_array( $params ) ? $params : array() );
		$address = is_array( $params['address'] ?? null ) ? $params['address'] : array();

		return rest_ensure_response( $this->build_headless_checkout_config_payload_from_storage( $token, $cart, $address ) );
	}

	public function rest_headless_checkout_validate( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, false );
		$payload = $request->get_json_params() ?: $request->get_params();
		$cart = $this->resolve_headless_checkout_cart( $token, $payload );
		$validation = $this->validate_headless_checkout_payload_for_storage( $cart, $payload );

		if ( is_wp_error( $validation ) ) {
			return $validation;
		}

		return rest_ensure_response(
			array(
				'valid'      => true,
				'cart'       => $this->build_headless_storage_cart_payload( $token, $cart ),
				'checkout'   => $validation,
				'pricing'    => $this->build_headless_checkout_pricing_payload( $cart, $validation ),
				'message'    => 'Checkout data is valid.',
			)
		);
	}

	public function rest_headless_checkout_place_order( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, false );
		$payload = $request->get_json_params() ?: $request->get_params();
		$cart = $this->resolve_headless_checkout_cart( $token, $payload );
		$validation = $this->validate_headless_checkout_payload_for_storage( $cart, $payload );

		if ( is_wp_error( $validation ) ) {
			return $validation;
		}

		$order = $this->create_headless_order_from_storage_cart( $cart, $validation );

		if ( is_wp_error( $order ) ) {
			return $order;
		}

		delete_option( $this->get_headless_storage_cart_key( $token ) );
		delete_transient( $this->get_headless_storage_cart_key( $token ) );

		return rest_ensure_response(
			array(
				'order_id'          => $order->get_id(),
				'order_number'      => $order->get_order_number(),
				'payment_status'    => (string) ( $order->get_meta( '_frankies_payment_state', true ) ?: 'deferred' ),
				'status'            => $order->get_status(),
				'confirmation_url'  => rest_url( self::MENU_NAMESPACE . '/orders/' . $order->get_id() . '/confirmation?key=' . rawurlencode( $order->get_order_key() ) ),
				'next_actions'      => $this->build_headless_order_next_actions( $order ),
				'confirmation'      => $this->build_headless_order_confirmation_payload( $order ),
			)
		);
	}

	public function rest_headless_delivery_validate( WP_REST_Request $request ) {
		$payload = $request->get_json_params() ?: $request->get_params();
		$location = is_array( $payload['location'] ?? null ) ? $payload['location'] : $payload;
		$latitude = isset( $location['latitude'] ) ? (float) $location['latitude'] : null;
		$longitude = isset( $location['longitude'] ) ? (float) $location['longitude'] : null;
		$settings = $this->get_headless_store_settings();

		if ( ! is_numeric( $latitude ) || ! is_numeric( $longitude ) ) {
			return new WP_Error( 'frankies_delivery_coordinates_required', 'Latitude and longitude are required for delivery validation.', array( 'status' => 422 ) );
		}

		if ( empty( $settings['store_location'] ) ) {
			return new WP_Error( 'frankies_delivery_store_location_missing', 'Store delivery location is not configured.', array( 'status' => 422 ) );
		}

		$distance_km = $this->calculate_haversine_distance_km(
			(float) $settings['store_location']['lat'],
			(float) $settings['store_location']['lng'],
			(float) $latitude,
			(float) $longitude
		);
		$available = $settings['delivery_radius_km'] <= 0 || $distance_km <= $settings['delivery_radius_km'];

		return rest_ensure_response(
			array(
				'available'      => $available,
				'distance_km'    => round( $distance_km, 2 ),
				'radius_km'      => (float) $settings['delivery_radius_km'],
				'pickup_address' => $settings['pickup_address'],
				'store_location' => $settings['store_location'],
				'message'        => $available
					? 'Delivery is available for this location.'
					: 'This address is outside the current delivery radius.',
			)
		);
	}

	public function rest_headless_order_confirmation( WP_REST_Request $request ) {
		$order = wc_get_order( absint( $request['order_id'] ) );

		if ( ! $order instanceof WC_Order ) {
			$this->log_event( 'warning', 'Headless order confirmation requested for missing order.', array( 'order_id' => absint( $request['order_id'] ) ) );
			return new WP_Error( 'frankies_headless_order_not_found', 'Order not found.', array( 'status' => 404 ) );
		}

		$order_key = sanitize_text_field( (string) $request->get_param( 'key' ) );
		if ( ! current_user_can( 'manage_woocommerce' ) && ! hash_equals( $order->get_order_key(), $order_key ) ) {
			$this->log_event( 'warning', 'Headless order confirmation rejected due to invalid order key.', array( 'order_id' => $order->get_id() ) );
			return new WP_Error( 'frankies_headless_order_forbidden', 'Invalid order key.', array( 'status' => 403 ) );
		}

		return rest_ensure_response( $this->build_headless_order_confirmation_payload( $order ) );
	}

	public function rest_menu_item( WP_REST_Request $request ) {
		$product = wc_get_product( wc_get_product_id_by_slug( sanitize_title( $request['slug'] ) ) );

		if ( ! $product instanceof WC_Product || 'publish' !== $product->get_status() ) {
			return new WP_Error( 'frankies_menu_item_not_found', 'Menu item not found.', array( 'status' => 404 ) );
		}

		return new WP_REST_Response( $this->build_product_detail_payload( $product ) );
	}

	public function rest_cart( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, false );
		$cart = $this->get_cart( $token );

		return new WP_REST_Response( $this->build_cart_payload( $token, $cart ) );
	}

	public function rest_add_cart_item( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, true );
		$cart = $this->get_cart( $token );
		$item = $this->sanitize_cart_item_input( $request->get_json_params() ?: $request->get_params() );

		if ( is_wp_error( $item ) ) {
			return $item;
		}

		$cart['items'][] = $item;
		$this->save_cart( $token, $cart );

		return new WP_REST_Response( $this->build_cart_payload( $token, $cart ), 201 );
	}

	public function rest_update_cart_item( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, false );
		$cart = $this->get_cart( $token );
		$item_key = (string) $request['item_key'];
		$payload = $request->get_json_params() ?: $request->get_params();

		foreach ( $cart['items'] as $index => $item ) {
			if ( $item['key'] !== $item_key ) {
				continue;
			}

			$quantity = max( 0, absint( $payload['quantity'] ?? $item['quantity'] ) );
			if ( 0 === $quantity ) {
				unset( $cart['items'][ $index ] );
			} else {
				$cart['items'][ $index ]['quantity'] = $quantity;
			}

			$cart['items'] = array_values( $cart['items'] );
			$this->save_cart( $token, $cart );

			return new WP_REST_Response( $this->build_cart_payload( $token, $cart ) );
		}

		return new WP_Error( 'frankies_cart_item_not_found', 'Cart item not found.', array( 'status' => 404 ) );
	}

	public function rest_delete_cart_item( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, false );
		$cart = $this->get_cart( $token );
		$item_key = (string) $request['item_key'];

		$cart['items'] = array_values(
			array_filter(
				$cart['items'],
				function( $item ) use ( $item_key ) {
					return $item['key'] !== $item_key;
				}
			)
		);

		$this->save_cart( $token, $cart );

		return new WP_REST_Response( $this->build_cart_payload( $token, $cart ) );
	}

	public function rest_checkout_options( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, false );
		$cart = $this->get_cart( $token );
		$payload = $request->get_json_params() ?: $request->get_params();

		return new WP_REST_Response(
			array(
				'cart'             => $this->build_cart_payload( $token, $cart ),
				'fulfillmentModes' => $this->get_fulfillment_modes( $cart, $payload['shippingAddress'] ?? array() ),
				'paymentMethods'   => $this->get_payment_methods_payload(),
			)
		);
	}

	public function rest_checkout( WP_REST_Request $request ) {
		$token = $this->get_or_create_cart_token( $request, false );
		$cart = $this->get_cart( $token );

		if ( empty( $cart['items'] ) ) {
			return new WP_Error( 'frankies_cart_empty', 'The cart is empty.', array( 'status' => 400 ) );
		}

		$payload = $request->get_json_params() ?: $request->get_params();
		$order = $this->create_order_from_cart( $cart, $payload );

		if ( is_wp_error( $order ) ) {
			return $order;
		}

		delete_transient( $this->get_cart_storage_key( $token ) );

		return new WP_REST_Response(
			array(
				'orderId'           => $order->get_id(),
				'orderNumber'       => $order->get_order_number(),
				'status'            => $order->get_status(),
				'paymentStatus'     => $order->needs_payment() ? 'pending' : 'paid',
				'confirmationUrl'   => rest_url( self::REST_NAMESPACE . '/orders/' . $order->get_id() . '/confirmation?key=' . rawurlencode( $order->get_order_key() ) ),
				'orderConfirmation' => $this->build_order_confirmation_payload( $order ),
			),
			201
		);
	}

	public function rest_order_confirmation( WP_REST_Request $request ) {
		$order = wc_get_order( absint( $request['order_id'] ) );

		if ( ! $order instanceof WC_Order ) {
			return new WP_Error( 'frankies_order_not_found', 'Order not found.', array( 'status' => 404 ) );
		}

		$order_key = (string) $request->get_param( 'key' );
		if ( ! current_user_can( 'manage_woocommerce' ) && ! hash_equals( $order->get_order_key(), $order_key ) ) {
			return new WP_Error( 'frankies_order_forbidden', 'Invalid order key.', array( 'status' => 403 ) );
		}

		return new WP_REST_Response( $this->build_order_confirmation_payload( $order ) );
	}

	private function get_product_categories() {
		$terms = get_terms(
			array(
				'taxonomy'   => 'product_cat',
				'hide_empty' => false,
				'parent'     => 0,
			)
		);

		if ( is_wp_error( $terms ) ) {
			return array();
		}

		usort(
			$terms,
			function( $left, $right ) {
				$left_order = (int) get_term_meta( $left->term_id, '_frankies_display_order', true );
				$right_order = (int) get_term_meta( $right->term_id, '_frankies_display_order', true );

				if ( $left_order === $right_order ) {
					return strcasecmp( $left->name, $right->name );
				}

				return $left_order <=> $right_order;
			}
		);

		return $terms;
	}

	private function sanitize_menu_query_params( WP_REST_Request $request ) {
		return array(
			'category'     => sanitize_title( (string) $request->get_param( 'category' ) ),
			'featured'     => rest_sanitize_boolean( $request->get_param( 'featured' ) ),
			'search'       => sanitize_text_field( (string) $request->get_param( 'search' ) ),
			'availability' => $this->sanitize_availability( $request->get_param( 'availability' ) ?: 'available' ),
			'limit'        => max( 1, min( 100, absint( $request->get_param( 'limit' ) ?: 24 ) ) ),
			'initial'      => sanitize_title( (string) $request->get_param( 'initial' ) ),
		);
	}

	private function get_cached_menu_payload( $cache_key, $builder ) {
		$transient_key = 'frnk_menu_' . md5( $cache_key . '|' . get_option( Frankies_Headless_Plugin::CACHE_VERSION_KEY, 1 ) );
		$this->last_menu_cache_key = $cache_key;
		$cached = get_transient( $transient_key );

		if ( false !== $cached ) {
			$this->last_menu_cache_status = 'hit';
			$this->last_menu_build_ms = 0.0;
			return $cached;
		}

		$started_at = microtime( true );
		$value = is_callable( $builder ) ? call_user_func( $builder ) : null;
		$this->last_menu_build_ms = round( ( microtime( true ) - $started_at ) * 1000, 2 );
		$this->last_menu_cache_status = is_wp_error( $value ) ? 'error' : 'miss';

		if ( ! is_wp_error( $value ) ) {
			set_transient( $transient_key, $value, self::MENU_CACHE_TTL );
		}

		return $value;
	}

	private function finalize_public_menu_response( $data ) {
		$response = rest_ensure_response( $data );
		$payload = wp_json_encode( $data );
		$etag = '"' . md5( (string) $payload ) . '"';
		$if_none_match = isset( $_SERVER['HTTP_IF_NONE_MATCH'] ) ? trim( sanitize_text_field( wp_unslash( $_SERVER['HTTP_IF_NONE_MATCH'] ) ) ) : '';

		$response->header( 'Cache-Control', 'public, max-age=0, must-revalidate, s-maxage=' . self::MENU_CACHE_TTL . ', stale-while-revalidate=15' );
		$response->header( 'ETag', $etag );
		$response->header( 'X-Frankies-Menu-Cache', $this->last_menu_cache_status );
		$response->header( 'X-Frankies-Menu-Cache-Key', substr( md5( $this->last_menu_cache_key ), 0, 12 ) );
		$response->header( 'Server-Timing', 'menu-build;dur=' . $this->last_menu_build_ms );

		if ( $if_none_match && $if_none_match === $etag ) {
			$response->set_status( 304 );
			$response->set_data( null );
		}

		return $response;
	}

	private function build_menu_payload_v1( array $params ) {
		$categories_payload = $this->build_menu_categories_payload_v1();
		$categories = array();

		foreach ( $categories_payload['items'] as $category ) {
			if ( '' !== $params['category'] && $params['category'] !== $category['slug'] ) {
				continue;
			}

			$item_params = $params;
			$item_params['category'] = $category['slug'];
			$items = $this->build_menu_items_collection_v1( $item_params );

			if ( empty( $items ) && '' === $params['category'] ) {
				continue;
			}

			$categories[] = array_merge(
				$category,
				array(
					'items' => $items,
				)
			);
		}

		$sections = array_map(
			function( $category ) {
				$section_category = $category;
				unset( $section_category['items'] );

				return array(
					'category' => $section_category,
					'items'    => array_values( $category['items'] ?? array() ),
				);
			},
			$categories
		);

		return array(
			'meta'       => array(
				'version' => 'v1',
				'empty'   => empty( $categories ),
			),
			'categories' => array_values( $categories ),
			'sections'   => array_values( $sections ),
			'featured'   => $this->build_menu_items_collection_v1(
				array(
					'category'     => '',
					'featured'     => true,
					'search'       => '',
					'availability' => $params['availability'],
					'limit'        => min( 8, max( 1, (int) $params['limit'] ) ),
					'initial'      => '',
				)
			),
		);
	}

	private function build_menu_categories_payload_v1() {
		$terms = $this->get_product_categories();

		return array(
			'items' => array_map(
				function( $term ) {
					$summary = $this->api->map_term_summary( $term );

					return array(
						'id'          => $summary['id'],
						'slug'        => $summary['slug'],
						'name'        => $summary['name'],
						'image'       => $summary['image'],
						'image_alt'   => $summary['image_alt'],
						'count'       => $summary['item_count'],
						'sort_order'  => $summary['display_order'],
						'description' => $summary['description'],
						'cta_label'   => $summary['cta_label'],
					);
				},
				$terms
			),
		);
	}

	private function build_menu_items_payload_v1( array $params ) {
		$items = $this->build_menu_items_collection_v1( $params );

		return array(
			'filters' => array(
				'category'     => $params['category'],
				'featured'     => (bool) $params['featured'],
				'search'       => $params['search'],
				'availability' => $params['availability'],
			),
			'items'    => $items,
			'empty'    => empty( $items ),
		);
	}

	private function build_menu_bootstrap_payload_v1( array $params ) {
		$categories = $this->build_menu_categories_payload_v1();
		$initial_category = $this->resolve_initial_menu_category( $categories['items'], $params );

		return array(
			'meta' => array(
				'version'          => 'v1',
				'brand'            => get_bloginfo( 'name' ),
				'menu_title'       => 'Menu',
				'initial_category' => $initial_category,
			),
			'categories' => $categories['items'],
			'featured'   => $this->build_menu_items_collection_v1(
				array(
					'category'     => '',
					'featured'     => true,
					'search'       => '',
					'availability' => 'available',
					'limit'        => 8,
					'initial'      => '',
				)
			),
			'initial_items' => $this->build_menu_items_collection_v1(
				array(
					'category'     => $initial_category,
					'featured'     => false,
					'search'       => '',
					'availability' => 'available',
					'limit'        => $params['limit'],
					'initial'      => '',
				)
			),
			'cart' => array(
				'item_count' => 0,
				'subtotal'   => $this->api->format_money( 0 ),
				'total'      => $this->api->format_money( 0 ),
				'currency'   => get_woocommerce_currency(),
			),
		);
	}

	private function build_menu_items_collection_v1( array $params ) {
		$products = $this->query_menu_products( $params );
		$products = array_values(
			array_filter(
				$products,
				function( $product ) use ( $params ) {
					if ( ! $product instanceof WC_Product ) {
						return false;
					}

					if ( '' !== ( $params['availability'] ?? '' ) && $this->api->get_product_availability( $product ) !== $params['availability'] ) {
						return false;
					}

					return true;
				}
			)
		);

		return array_map(
			function( $product ) {
				return $this->build_menu_item_card_payload_v1( $product );
			},
			$products
		);
	}

	private function build_menu_item_card_payload_v1( WC_Product $product ) {
		$payload = $this->api->map_product_card( $product );
		$payload['price'] = (float) ( $payload['base_price'] ?? 0 );
		$payload['add_on_groups'] = $this->get_add_on_groups( $product->get_id() );
		$payload['spice_options'] = $this->get_spice_levels( $product->get_id() );
		$payload['allergens_enabled'] = $this->product_allergens_enabled( $product->get_id() );
		unset( $payload['sku'] );
		unset( $payload['is_featured'] );
		unset( $payload['dark'] );
		unset( $payload['upsell_ids'] );

		return $payload;
	}

	private function build_menu_item_payload_v1( $item ) {
		$product = $this->find_public_product( $item );

		if ( ! $product instanceof WC_Product ) {
			return new WP_Error( 'frankies_headless_menu_item_not_found', 'Menu item not found.', array( 'status' => 404 ) );
		}

		return $this->build_product_detail_payload( $product );
	}

	private function resolve_initial_menu_category( array $categories, array $params ) {
		$requested = array_filter(
			array(
				$params['initial'] ?? '',
				$params['category'] ?? '',
			)
		);

		foreach ( $requested as $slug ) {
			foreach ( $categories as $category ) {
				if ( ( $category['slug'] ?? '' ) === $slug ) {
					return $slug;
				}
			}
		}

		foreach ( $categories as $category ) {
			if ( ! empty( $category['count'] ) ) {
				return (string) $category['slug'];
			}
		}

		return (string) ( $categories[0]['slug'] ?? '' );
	}

	private function get_products_for_category( $term_id, $preview = false ) {
		return wc_get_products(
			array(
				'status'   => $preview ? array( 'publish', 'draft', 'private', 'pending' ) : array( 'publish' ),
				'limit'    => -1,
				'category' => array( get_term_field( 'slug', $term_id, 'product_cat' ) ),
				'orderby'  => 'menu_order',
				'order'    => 'ASC',
			)
		);
	}

	private function query_menu_products( array $params ) {
		$query_args = array(
			'status'  => array( 'publish' ),
			'limit'   => $params['limit'],
			'orderby' => 'menu_order',
			'order'   => 'ASC',
			'return'  => 'objects',
		);

		if ( '' !== $params['category'] ) {
			$query_args['category'] = array( $params['category'] );
		}

		if ( ! empty( $params['search'] ) ) {
			$query_args['s'] = $params['search'];
		}

		$meta_query = array();

		if ( $params['featured'] ) {
			$meta_query[] = array(
				'key'   => '_frankies_featured_product',
				'value' => 'yes',
			);
		}

		if ( '' !== $params['availability'] ) {
			$meta_query[] = array(
				'key'   => '_frankies_availability',
				'value' => $params['availability'],
			);
		}

		if ( ! empty( $meta_query ) ) {
			$query_args['meta_query'] = $meta_query;
		}

		$products = wc_get_products( $query_args );

		return array_values(
			array_filter(
				$products,
				function( $product ) {
					return $product instanceof WC_Product && 'publish' === $product->get_status();
				}
			)
		);
	}

	private function find_public_product( $item ) {
		if ( is_numeric( $item ) ) {
			$product = wc_get_product( absint( $item ) );
		} else {
			$product = wc_get_product( wc_get_product_id_by_slug( sanitize_title( $item ) ) );
		}

		if ( ! $product instanceof WC_Product || 'publish' !== $product->get_status() ) {
			return null;
		}

		return $product;
	}

	private function build_product_detail_payload( WC_Product $product ) {
		$payload = $this->api->map_product_card( $product );

		$payload['gallery'] = wp_list_pluck( $this->api->get_product_gallery_payload( $product ), 'url' );
		$payload['spice_options'] = $this->get_spice_levels( $product->get_id() );
		$payload['addon_groups'] = $this->get_add_on_groups( $product->get_id() );
		$payload['add_on_groups'] = $payload['addon_groups'];
		$payload['allergens_enabled'] = $this->product_allergens_enabled( $product->get_id() );
		$payload['upsell_products'] = array_values(
			array_map(
				array( $this, 'build_menu_item_card_payload_v1' ),
				array_filter(
					array_map( 'wc_get_product', $product->get_upsell_ids() )
				)
			)
		);
		$payload['empty_state'] = 'unavailable' === $payload['availability'] ? 'currently_unavailable' : '';
		unset( $payload['price'] );
		unset( $payload['sku'] );
		unset( $payload['is_featured'] );
		unset( $payload['dark'] );
		unset( $payload['upsell_ids'] );

		return $payload;
	}

	private function build_product_fulfillment_payload( $product_id ) {
		$mode = $this->sanitize_fulfillment_mode( get_post_meta( $product_id, '_frankies_fulfillment_mode', true ) );

		return array(
			'mode'             => $mode,
			'supportsPickup'   => in_array( $mode, array( 'both', 'pickup' ), true ),
			'supportsDelivery' => in_array( $mode, array( 'both', 'delivery' ), true ),
		);
	}

	private function get_spice_levels( $product_id ) {
		$data = $this->decode_json_meta( get_post_meta( $product_id, '_frankies_spice_levels', true ) );
		return $this->sanitize_spice_levels( $data );
	}

	private function get_add_on_groups( $product_id ) {
		$data = $this->decode_json_meta( get_post_meta( $product_id, '_frankies_add_on_groups', true ) );

		if ( empty( $data ) ) {
			$data = $this->normalize_woocommerce_product_add_ons_meta( get_post_meta( $product_id, '_product_addons', true ) );
		}

		return $this->sanitize_add_on_groups( $data, true );
	}

	private function product_allergens_enabled( $product_id ) {
		return 'yes' === get_post_meta( $product_id, '_frankies_allergens_enabled', true );
	}

	private function normalize_woocommerce_product_add_ons_meta( $raw_meta ) {
		if ( is_string( $raw_meta ) ) {
			$maybe_unserialized = maybe_unserialize( $raw_meta );
			$raw_meta = is_array( $maybe_unserialized ) ? $maybe_unserialized : array();
		}

		if ( ! is_array( $raw_meta ) ) {
			return array();
		}

		$groups = array();

		foreach ( $raw_meta as $group ) {
			if ( ! is_array( $group ) ) {
				continue;
			}

			$label = sanitize_text_field( $group['name'] ?? $group['title'] ?? '' );
			$group_id = sanitize_title( $group['name'] ?? $group['title'] ?? $label );
			$type = sanitize_key( (string) ( $group['type'] ?? '' ) );
			$required = ! empty( $group['required'] );
			$options = array();

			foreach ( (array) ( $group['options'] ?? array() ) as $option ) {
				if ( ! is_array( $option ) ) {
					continue;
				}

				$option_label = sanitize_text_field( $option['label'] ?? $option['name'] ?? '' );
				$option_id = sanitize_title( $option['label'] ?? $option['name'] ?? $option_label );

				if ( '' === $option_id || '' === $option_label ) {
					continue;
				}

				$options[] = array(
					'key'   => $option_id,
					'label' => $option_label,
					'price' => wc_format_decimal( $option['price'] ?? $option['price_adjustment'] ?? 0, wc_get_price_decimals() ),
				);
			}

			if ( '' === $group_id || '' === $label || empty( $options ) ) {
				continue;
			}

			$groups[] = array(
				'key'      => $group_id,
				'label'    => $label,
				'type'     => in_array( $type, array( 'radiobutton', 'radio', 'select' ), true ) ? 'single' : 'multiple',
				'min'      => $required ? 1 : 0,
				'max'      => in_array( $type, array( 'radiobutton', 'radio', 'select' ), true ) ? 1 : max( 1, absint( $group['max'] ?? 0 ) ),
				'options'  => $options,
				'required' => $required,
			);
		}

		return array_values( $groups );
	}

	private function sanitize_spice_levels( $data ) {
		if ( is_string( $data ) ) {
			$data = $this->decode_json_meta( $data );
		}

		if ( ! is_array( $data ) ) {
			return array();
		}

		$levels = array();

		foreach ( $data as $level ) {
			if ( ! is_array( $level ) ) {
				continue;
			}

			$id = sanitize_title( $level['key'] ?? $level['id'] ?? $level['label'] ?? '' );
			$label = sanitize_text_field( $level['label'] ?? '' );
			$price_adjustment = wc_format_decimal( $level['price_adjustment'] ?? $level['price'] ?? 0, wc_get_price_decimals() );

			if ( '' === $id || '' === $label ) {
				continue;
			}

			$levels[] = array(
				'key'              => $id,
				'label'            => $label,
				'price_adjustment' => (string) $price_adjustment,
			);
		}

		return array_values( $levels );
	}

	private function sanitize_add_on_groups( $data, $with_prices = false ) {
		if ( is_string( $data ) ) {
			$data = $this->decode_json_meta( $data );
		}

		if ( ! is_array( $data ) ) {
			return array();
		}

		$groups = array();

		foreach ( $data as $group ) {
			if ( ! is_array( $group ) ) {
				continue;
			}

			$group_id = sanitize_title( $group['key'] ?? $group['id'] ?? $group['label'] ?? '' );
			$label = sanitize_text_field( $group['label'] ?? '' );
			$type = 'radio' === ( $group['type'] ?? '' ) || 'single' === ( $group['type'] ?? '' ) ? 'single' : 'multiple';
			$min = max( 0, absint( $group['min'] ?? 0 ) );
			$max = max( $min, absint( $group['max'] ?? 0 ) );
			$options = array();

			foreach ( (array) ( $group['options'] ?? array() ) as $option ) {
				if ( ! is_array( $option ) ) {
					continue;
				}

				$option_id = sanitize_title( $option['key'] ?? $option['id'] ?? $option['label'] ?? '' );
				$option_label = sanitize_text_field( $option['label'] ?? '' );
				$price = wc_format_decimal( $option['price_adjustment'] ?? $option['price'] ?? 0, wc_get_price_decimals() );

				if ( '' === $option_id || '' === $option_label ) {
					continue;
				}

				$payload = array(
					'id'         => $option_id,
					'key'        => $option_id,
					'name'       => $option_label,
					'label'      => $option_label,
					'product_id' => absint( $option['product_id'] ?? $option['productId'] ?? 0 ),
				);

				if ( $with_prices ) {
					$payload['price_adjustment'] = array(
						'raw'       => (string) $price,
						'formatted' => $this->api->format_money( $price )['formatted'],
					);
				} else {
					$payload['price_adjustment'] = (string) $price;
				}

				$options[] = $payload;
			}

			if ( '' === $group_id || '' === $label || empty( $options ) ) {
				continue;
			}

			$groups[] = array(
				'id'       => $group_id,
				'key'      => $group_id,
				'name'     => $label,
				'label'    => $label,
				'type'     => $type,
				'required' => $min > 0,
				'min'      => 'single' === $type ? min( 1, max( 0, $min ) ) : $min,
				'max'      => 'single' === $type ? 1 : $max,
				'options'  => $options,
			);
		}

		return array_values( $groups );
	}

	private function decode_json_meta( $raw ) {
		if ( is_array( $raw ) ) {
			return $raw;
		}

		$raw = trim( (string) $raw );

		if ( '' === $raw ) {
			return array();
		}

		$decoded = json_decode( $raw, true );
		return is_array( $decoded ) ? $decoded : array();
	}

	private function sanitize_fulfillment_mode( $mode ) {
		$mode = sanitize_key( (string) $mode );
		return in_array( $mode, array( 'pickup', 'delivery', 'both' ), true ) ? $mode : 'both';
	}

	private function sanitize_cart_item_input( $payload ) {
		$product_id = absint( $payload['productId'] ?? 0 );
		$quantity = max( 1, absint( $payload['quantity'] ?? 1 ) );
		$product = wc_get_product( $product_id );

		if ( ! $product instanceof WC_Product || 'publish' !== $product->get_status() ) {
			return new WP_Error( 'frankies_invalid_product', 'Invalid product.', array( 'status' => 422 ) );
		}

		if ( 'unavailable' === $this->api->get_product_availability( $product ) ) {
			return new WP_Error( 'frankies_unavailable_product', 'This item is currently unavailable.', array( 'status' => 422 ) );
		}

		$spice_level = sanitize_title( $payload['spiceLevel'] ?? '' );
		$allowed_spice_levels = $this->get_spice_levels( $product_id );
		if ( '' !== $spice_level && ! empty( $allowed_spice_levels ) ) {
			$allowed_ids = wp_list_pluck( $allowed_spice_levels, 'key' );
			if ( ! in_array( $spice_level, $allowed_ids, true ) ) {
				return new WP_Error( 'frankies_invalid_spice_level', 'Invalid spice level.', array( 'status' => 422 ) );
			}
		}

		$validated_add_ons = $this->validate_selected_add_ons( $product_id, (array) ( $payload['addOns'] ?? array() ) );
		if ( is_wp_error( $validated_add_ons ) ) {
			return $validated_add_ons;
		}

		return array(
			'key'        => wp_generate_uuid4(),
			'productId'  => $product_id,
			'quantity'   => $quantity,
			'spiceLevel' => $spice_level,
			'addOns'     => $validated_add_ons,
		);
	}

	private function validate_selected_add_ons( $product_id, array $selected_add_ons ) {
		$groups = $this->sanitize_add_on_groups( get_post_meta( $product_id, '_frankies_add_on_groups', true ) );
		$options_by_id = array();
		$selection_counts = array();

		foreach ( $groups as $group ) {
			$selection_counts[ $group['key'] ] = 0;
			foreach ( $group['options'] as $option ) {
				$options_by_id[ $option['key'] ] = array(
					'group_key' => $group['key'],
					'option'    => $option,
				);
			}
		}

		$validated = array();

		foreach ( $selected_add_ons as $add_on ) {
			$add_on_payload = is_array( $add_on ) ? $add_on : array( 'id' => $add_on );
			$add_on_id = sanitize_title( $add_on_payload['option_id'] ?? $add_on_payload['optionId'] ?? $add_on_payload['key'] ?? $add_on_payload['id'] ?? '' );
			$requested_group = sanitize_title( $add_on_payload['group_id'] ?? $add_on_payload['groupId'] ?? '' );

			if ( '' === $add_on_id || empty( $options_by_id[ $add_on_id ] ) ) {
				return new WP_Error( 'frankies_invalid_add_on', 'Invalid add-on selected.', array( 'status' => 422 ) );
			}

			$resolved = $options_by_id[ $add_on_id ];
			if ( '' !== $requested_group && $requested_group !== $resolved['group_key'] ) {
				return new WP_Error( 'frankies_invalid_add_on_group', 'Selected add-on does not belong to the requested group.', array( 'status' => 422 ) );
			}
			$option = $resolved['option'];
			$selection_counts[ $resolved['group_key'] ]++;
			$validated[] = array(
				'group_id'         => $resolved['group_key'],
				'key'              => $option['key'],
				'label'            => $option['label'],
				'price_adjustment' => wc_format_decimal( is_array( $option['price_adjustment'] ) ? ( $option['price_adjustment']['raw'] ?? 0 ) : $option['price_adjustment'], wc_get_price_decimals() ),
				'product_id'       => absint( $option['product_id'] ?? 0 ),
			);
		}

		foreach ( $groups as $group ) {
			$count = $selection_counts[ $group['key'] ] ?? 0;
			if ( $count < (int) $group['min'] ) {
				return new WP_Error( 'frankies_add_on_min', 'A required add-on selection is missing.', array( 'status' => 422 ) );
			}

			if ( $count > (int) $group['max'] ) {
				return new WP_Error( 'frankies_add_on_max', 'Too many add-ons selected for a group.', array( 'status' => 422 ) );
			}
		}

		return array_values( $validated );
	}

	private function bootstrap_headless_wc_cart( WP_REST_Request $request, $create_if_missing ) {
		// Headless guests do not rely on a theme or a browser-bound Woo cart cookie.
		// Instead we bridge the request into Woo's Store API session layer using a cart token.
		if ( ! function_exists( 'WC' ) || ! class_exists( 'WooCommerce' ) ) {
			$this->log_event( 'error', 'WooCommerce was unavailable during headless cart bootstrap.' );
			return new WP_Error( 'frankies_woocommerce_missing', 'WooCommerce is not available.', array( 'status' => 500 ) );
		}

		$incoming_token = $this->get_or_create_cart_token( $request, false );
		$use_store_api_session = '' !== $incoming_token;

		if ( $use_store_api_session && ! class_exists( '\Automattic\WooCommerce\StoreApi\SessionHandler' ) ) {
			$this->log_event( 'error', 'WooCommerce Store API session handler was unavailable during headless cart bootstrap.' );
			return new WP_Error( 'frankies_cart_session_unavailable', 'WooCommerce session bridge is unavailable.', array( 'status' => 500 ) );
		}

		if ( $use_store_api_session && ! \Automattic\WooCommerce\StoreApi\Utilities\CartTokenUtils::validate_cart_token( $incoming_token ) ) {
			$this->log_event( 'warning', 'Incoming headless cart token failed validation.' );
			return new WP_Error( 'frankies_invalid_cart_token', 'Cart token is invalid or expired.', array( 'status' => 401 ) );
		}

		$previous_header = $_SERVER['HTTP_CART_TOKEN'] ?? null;
		if ( $use_store_api_session ) {
			$_SERVER['HTTP_CART_TOKEN'] = $incoming_token;
		}

		if ( $use_store_api_session ) {
			add_filter( 'woocommerce_session_handler', array( $this, 'use_store_api_session_handler' ) );
		}

		WC()->session = null;
		WC()->customer = null;
		WC()->cart = null;
		WC()->initialize_session();
		WC()->initialize_cart();
		WC()->cart->cart_context = 'store-api';
		WC()->cart->get_cart();

		if ( $use_store_api_session ) {
			remove_filter( 'woocommerce_session_handler', array( $this, 'use_store_api_session_handler' ) );
			if ( null === $previous_header ) {
				unset( $_SERVER['HTTP_CART_TOKEN'] );
			} else {
				$_SERVER['HTTP_CART_TOKEN'] = $previous_header;
			}
		}

		if ( ! WC()->session ) {
			$this->log_event( 'error', 'WooCommerce failed to initialize a session for a headless cart request.' );
			return new WP_Error( 'frankies_cart_session_failed', 'Unable to initialize the cart session.', array( 'status' => 500 ) );
		}

		if ( $create_if_missing ) {
			WC()->session->set_customer_session_cookie( true );
		}

		$customer_id = (string) WC()->session->get_customer_id();
		$cart_token = \Automattic\WooCommerce\StoreApi\Utilities\CartTokenUtils::get_cart_token( $customer_id );

		return array(
			'cart_token'  => $cart_token,
			'customer_id' => $customer_id,
		);
	}

	public function use_store_api_session_handler() {
		return '\Automattic\WooCommerce\StoreApi\SessionHandler';
	}

	private function validate_headless_cart_request_item( array $payload ) {
		$product_id = absint( $payload['product_id'] ?? $payload['productId'] ?? 0 );
		$quantity = max( 1, absint( $payload['quantity'] ?? 1 ) );
		$product = wc_get_product( $product_id );

		if ( ! $product instanceof WC_Product || 'publish' !== $product->get_status() ) {
			return new WP_Error( 'frankies_invalid_product', 'Invalid product.', array( 'status' => 422 ) );
		}

		if ( 'unavailable' === $this->api->get_product_availability( $product ) ) {
			return new WP_Error( 'frankies_unavailable_product', 'This item is currently unavailable.', array( 'status' => 422 ) );
		}

		$spice_level_key = sanitize_title( (string) ( $payload['spice_level'] ?? $payload['spiceLevel'] ?? '' ) );
		$spice_option = $this->get_valid_spice_option( $product_id, $spice_level_key );

		if ( is_wp_error( $spice_option ) ) {
			return $spice_option;
		}

		$addons = $payload['selected_add_ons'] ?? $payload['selectedAddOns'] ?? $payload['addons'] ?? $payload['addOns'] ?? array();
		$validated_add_ons = $this->validate_selected_add_ons( $product_id, (array) $addons );

		if ( is_wp_error( $validated_add_ons ) ) {
			return $validated_add_ons;
		}

		$allergies_note = '';
		if ( $this->product_allergens_enabled( $product_id ) ) {
			$allergies_note = sanitize_textarea_field( (string) ( $payload['allergies_note'] ?? $payload['allergiesNote'] ?? '' ) );
		}

		return array(
			'product_id'   => $product_id,
			'quantity'     => $quantity,
			'spice_option' => $spice_option,
			'addons'       => $validated_add_ons,
			'allergies_note' => $allergies_note,
		);
	}

	private function get_valid_spice_option( $product_id, $spice_level_key ) {
		$options = $this->get_spice_levels( $product_id );

		if ( '' === $spice_level_key ) {
			return null;
		}

		foreach ( $options as $option ) {
			if ( $option['key'] === $spice_level_key ) {
				return $option;
			}
		}

		return new WP_Error( 'frankies_invalid_spice_level', 'Invalid spice level.', array( 'status' => 422 ) );
	}

	private function build_wc_cart_item_data( array $item ) {
		$addons_total = 0.0;
		$addons = array();

		foreach ( $item['addons'] as $addon ) {
			$price_adjustment = (float) $addon['price_adjustment'];
			$addons_total += $price_adjustment;
			$addons[] = array(
				'key'              => $addon['key'],
				'label'            => $addon['label'],
				'price_adjustment' => (string) $addon['price_adjustment'],
				'product_id'       => absint( $addon['product_id'] ?? 0 ),
			);
		}

		$spice = null;
		$spice_adjustment = 0.0;
		if ( is_array( $item['spice_option'] ) ) {
			$spice_adjustment = (float) $item['spice_option']['price_adjustment'];
			$spice = array(
				'key'              => $item['spice_option']['key'],
				'label'            => $item['spice_option']['label'],
				'price_adjustment' => (string) $item['spice_option']['price_adjustment'],
			);
		}

		$config = array(
			'spice_level'      => $spice,
			'addons'           => $addons,
			'allergies_note'   => sanitize_textarea_field( (string) ( $item['allergies_note'] ?? '' ) ),
			'price_adjustment' => (string) wc_format_decimal( $spice_adjustment + $addons_total, wc_get_price_decimals() ),
		);

		return array(
			'frankies_config' => $config,
			'frankies_hash'   => md5( wp_json_encode( $config ) ),
		);
	}

	public function apply_headless_cart_item_pricing( $cart ) {
		if ( ! $cart instanceof WC_Cart ) {
			return;
		}

		foreach ( $cart->get_cart() as $cart_item_key => $cart_item ) {
			if ( empty( $cart_item['frankies_config'] ) || empty( $cart_item['data'] ) || ! $cart_item['data'] instanceof WC_Product ) {
				continue;
			}

			$base_price = (float) $cart_item['data']->get_regular_price();
			if ( $base_price <= 0 ) {
				$base_price = (float) $cart_item['data']->get_price( 'edit' );
			}

			$adjustment = (float) ( $cart_item['frankies_config']['price_adjustment'] ?? 0 );
			$cart_item['data']->set_price( max( 0, $base_price + $adjustment ) );
		}
	}

	public function render_headless_cart_item_data( $item_data, $cart_item ) {
		if ( empty( $cart_item['frankies_config'] ) || ! is_array( $cart_item['frankies_config'] ) ) {
			return $item_data;
		}

		if ( ! empty( $cart_item['frankies_config']['spice_level']['label'] ) ) {
			$item_data[] = array(
				'key'   => 'Spice Level',
				'value' => sanitize_text_field( $cart_item['frankies_config']['spice_level']['label'] ),
			);
		}

		foreach ( (array) ( $cart_item['frankies_config']['addons'] ?? array() ) as $addon ) {
			$item_data[] = array(
				'key'   => 'Add-on',
				'value' => sanitize_text_field( $addon['label'] ),
			);
		}

		if ( ! empty( $cart_item['frankies_config']['allergies_note'] ) ) {
			$item_data[] = array(
				'key'   => 'Allergies',
				'value' => sanitize_textarea_field( $cart_item['frankies_config']['allergies_note'] ),
			);
		}

		return $item_data;
	}

	public function copy_headless_cart_item_meta_to_order( $item, $cart_item_key, $values, $order ) {
		if ( empty( $values['frankies_config'] ) || ! is_array( $values['frankies_config'] ) ) {
			return;
		}

		// Save both a human-readable summary and structured hidden meta so
		// the success API can reconstruct the same option shape the cart used.
		if ( ! empty( $values['frankies_config']['spice_level']['label'] ) ) {
			$item->add_meta_data( 'Spice Level', sanitize_text_field( $values['frankies_config']['spice_level']['label'] ), true );
			$item->add_meta_data( '_frankies_spice_level', wp_json_encode( $values['frankies_config']['spice_level'] ), true );
		}

		if ( ! empty( $values['frankies_config']['addons'] ) ) {
			$item->add_meta_data(
				'Add-ons',
				implode(
					', ',
					array_map(
						function( $addon ) {
							return sanitize_text_field( $addon['label'] );
						},
						(array) $values['frankies_config']['addons']
					)
				),
				true
			);
			$item->add_meta_data( '_frankies_addons', wp_json_encode( array_values( (array) $values['frankies_config']['addons'] ) ), true );
		}

		if ( ! empty( $values['frankies_config']['allergies_note'] ) ) {
			$item->add_meta_data( 'Allergies', sanitize_textarea_field( $values['frankies_config']['allergies_note'] ), true );
			$item->add_meta_data( '_frankies_allergies_note', sanitize_textarea_field( $values['frankies_config']['allergies_note'] ), true );
		}
	}

	private function build_headless_cart_payload( $cart_token ) {
		$items = array();
		$upsell_ids = array();
		$cart_product_ids = array();

		foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
			$product = $cart_item['data'] ?? null;

			if ( ! $product instanceof WC_Product ) {
				continue;
			}

			$cart_product_ids[] = $product->get_id();
			$upsell_ids = array_merge( $upsell_ids, $product->get_upsell_ids() );
			$image = $this->api->get_product_image_payload( $product );
			$line_subtotal = (float) $cart_item['line_subtotal'];
			$line_total = (float) $cart_item['line_total'];
			$selected_options = $this->build_headless_selected_options_payload( $cart_item );

			$items[] = array(
				'key'              => $cart_item_key,
				'product_id'       => (int) $product->get_id(),
				'name'             => $product->get_name(),
				'image'            => $image['url'],
				'quantity'         => (int) $cart_item['quantity'],
				'unit_price'       => $this->api->format_money( $product->get_price() ),
				'line_subtotal'    => $this->api->format_money( $line_subtotal ),
				'line_total'       => $this->api->format_money( $line_total ),
				'selected_options' => $selected_options,
				'summary_lines'    => $this->build_headless_summary_lines( $selected_options ),
			);
		}

		$available_upsells = array_values(
			array_map(
				array( $this, 'build_menu_item_card_payload_v1' ),
				array_filter(
					array_map( 'wc_get_product', array_unique( array_diff( array_map( 'absint', $upsell_ids ), $cart_product_ids ) ) ),
					function( $product ) {
						return $product instanceof WC_Product
							&& 'publish' === $product->get_status()
							&& 'available' === $this->api->get_product_availability( $product );
					}
				)
			)
		);

		return array(
			'cart_token'        => $cart_token,
			'items'             => $items,
			'item_count'        => (int) WC()->cart->get_cart_contents_count(),
			'subtotal'          => $this->api->format_money( WC()->cart->get_subtotal() ),
			'taxes'             => $this->api->format_money( WC()->cart->get_total_tax() ),
			'fees'              => $this->api->format_money( WC()->cart->get_fee_total() + WC()->cart->get_fee_tax() ),
			'total'             => $this->api->format_money( WC()->cart->get_total( 'edit' ) ),
			'currency'          => get_woocommerce_currency(),
			'available_upsells' => $available_upsells,
			'integration'       => array(
				'cart_token_header' => 'X-Frankies-Cart-Token',
				'guest_cart'        => true,
				'nonce'             => 'Guest storefront requests do not require a WordPress nonce. Send X-WP-Nonce only for authenticated wp-admin sessions.',
			),
		);
	}

	private function build_headless_selected_options_payload( array $cart_item ) {
		$config = (array) ( $cart_item['frankies_config'] ?? array() );

		return array(
			'spice_level' => empty( $config['spice_level'] ) ? null : array(
				'key'              => $config['spice_level']['key'],
				'label'            => $config['spice_level']['label'],
				'price_adjustment' => $this->api->format_money( $config['spice_level']['price_adjustment'] ?? 0 ),
			),
			'addons' => array_map(
				function( $addon ) {
					return array(
						'key'              => $addon['key'],
						'label'            => $addon['label'],
						'price_adjustment' => $this->api->format_money( $addon['price_adjustment'] ?? 0 ),
					);
				},
				(array) ( $config['addons'] ?? array() )
			),
			'allergies_note' => sanitize_textarea_field( (string) ( $config['allergies_note'] ?? '' ) ),
		);
	}

	private function build_headless_summary_lines( array $selected_options ) {
		$lines = array();

		if ( ! empty( $selected_options['spice_level']['label'] ) ) {
			$lines[] = 'Spice: ' . $selected_options['spice_level']['label'];
		}

		foreach ( (array) ( $selected_options['addons'] ?? array() ) as $addon ) {
			$lines[] = 'Add-on: ' . sanitize_text_field( $addon['name'] ?? $addon['label'] ?? '' );
		}

		if ( ! empty( $selected_options['allergies_note'] ) ) {
			$lines[] = 'Allergies: ' . sanitize_textarea_field( $selected_options['allergies_note'] );
		}

		return $lines;
	}

	private function get_headless_storage_cart( $token ) {
		if ( '' === $token ) {
			return array(
				'items' => array(),
			);
		}

		$key = $this->get_headless_storage_cart_key( $token );
		$cart = get_option( $key, null );

		if ( ! is_array( $cart ) ) {
			$cart = get_transient( $key );
		}

		if ( ! is_array( $cart ) || ! isset( $cart['items'] ) || ! is_array( $cart['items'] ) ) {
			return array(
				'items' => array(),
			);
		}

		return $cart;
	}

	private function save_headless_storage_cart( $token, array $cart ) {
		if ( '' === $token ) {
			return;
		}

		$key = $this->get_headless_storage_cart_key( $token );
		$cart['updated_at'] = gmdate( DATE_ATOM );
		update_option( $key, $cart, false );
		set_transient( $key, $cart, self::CART_TTL );
	}

	private function get_headless_storage_cart_key( $token ) {
		return 'frankies_headless_cart_' . md5( $token );
	}

	private function build_headless_storage_cart_payload( $cart_token, array $cart ) {
		$items = array();
		$subtotal = 0.0;
		$item_count = 0;
		$cart_product_ids = array();
		$upsell_ids = array();

		foreach ( (array) $cart['items'] as $item ) {
			$product = wc_get_product( absint( $item['product_id'] ?? 0 ) );

			if ( ! $product instanceof WC_Product || 'publish' !== $product->get_status() ) {
				continue;
			}

			$base_price = (float) $product->get_regular_price();
			if ( $base_price <= 0 ) {
				$base_price = (float) $product->get_price( 'edit' );
			}

			$spice_adjustment = (float) ( $item['spice_option']['price_adjustment'] ?? 0 );
			$addons_total = 0.0;
			foreach ( (array) ( $item['addons'] ?? array() ) as $addon ) {
				$addons_total += (float) ( $addon['price_adjustment'] ?? 0 );
			}

			$unit_price = max( 0, $base_price + $spice_adjustment + $addons_total );
			$line_total = $unit_price * (int) ( $item['quantity'] ?? 0 );
			$item_count += (int) ( $item['quantity'] ?? 0 );
			$subtotal += $line_total;
			$cart_product_ids[] = $product->get_id();
			$upsell_ids = array_merge( $upsell_ids, $product->get_upsell_ids() );
			$image = $this->api->get_product_image_payload( $product );
			$selected_options = array(
				'spice_level' => empty( $item['spice_option'] ) ? null : array(
					'key' => sanitize_title( $item['spice_option']['key'] ?? '' ),
					'label' => sanitize_text_field( $item['spice_option']['label'] ?? '' ),
					'price_adjustment' => $this->api->format_money( $item['spice_option']['price_adjustment'] ?? 0 ),
				),
				'addons' => array_map(
					function( $addon ) {
						return array(
							'group_id' => sanitize_title( $addon['group_id'] ?? '' ),
							'option_id' => sanitize_title( $addon['key'] ?? $addon['option_id'] ?? '' ),
							'name' => sanitize_text_field( $addon['label'] ?? $addon['name'] ?? '' ),
							'price' => $this->api->format_money( $addon['price_adjustment'] ?? $addon['price'] ?? 0 ),
						);
					},
					(array) ( $item['addons'] ?? array() )
				),
				'allergies_note' => sanitize_textarea_field( (string) ( $item['allergies_note'] ?? '' ) ),
			);

			$items[] = array(
				'key' => sanitize_text_field( $item['key'] ?? '' ),
				'product_id' => (int) $product->get_id(),
				'slug' => $product->get_slug(),
				'name' => $product->get_name(),
				'image' => $image['url'],
				'quantity' => (int) ( $item['quantity'] ?? 0 ),
				'base_price' => $this->api->format_money( $base_price ),
				'line_subtotal' => $this->api->format_money( $line_total ),
				'line_total' => $this->api->format_money( $line_total ),
				'selected_add_ons' => array_values(
					array_map(
						function( $addon ) {
							return array(
								'group_id' => sanitize_title( $addon['group_id'] ?? '' ),
								'option_id' => sanitize_title( $addon['key'] ?? $addon['option_id'] ?? '' ),
								'name' => sanitize_text_field( $addon['label'] ?? $addon['name'] ?? '' ),
								'price' => $this->api->format_money( $addon['price_adjustment'] ?? $addon['price'] ?? 0 ),
							);
						},
						(array) ( $item['addons'] ?? array() )
					)
				),
				'selected_options' => $selected_options,
				'summary_lines' => $this->build_headless_summary_lines( $selected_options ),
				'allergies_note' => sanitize_textarea_field( (string) ( $item['allergies_note'] ?? '' ) ),
				'fulfillment_mode' => $this->build_product_fulfillment_payload( $product->get_id() )['mode'],
			);
		}

		$available_upsells = array_values(
			array_map(
				array( $this, 'build_menu_item_card_payload_v1' ),
				array_filter(
					array_map( 'wc_get_product', array_unique( array_diff( array_map( 'absint', $upsell_ids ), $cart_product_ids ) ) ),
					function( $product ) {
						return $product instanceof WC_Product
							&& 'publish' === $product->get_status()
							&& 'available' === $this->api->get_product_availability( $product );
					}
				)
			)
		);

		return array(
			'items' => $items,
			'item_count' => $item_count,
			'subtotal' => $this->api->format_money( $subtotal ),
			'taxes' => $this->api->format_money( 0 ),
			'fees' => $this->api->format_money( 0 ),
			'discount' => $this->api->format_money( 0 ),
			'tip' => $this->api->format_money( 0 ),
			'total' => $this->api->format_money( $subtotal ),
			'currency' => get_woocommerce_currency(),
			'available_upsells' => $available_upsells,
			'coupon_code' => '',
		);
	}

	private function build_headless_checkout_config_payload_from_storage( $cart_token, array $cart, array $address = array() ) {
		$delivery_methods = $this->get_headless_delivery_methods( $address );
		$fulfillment_modes = $this->get_headless_enabled_fulfillment_modes_for_storage( $cart, $address );

		if ( empty( $fulfillment_modes ) ) {
			$fulfillment_modes = array(
				array(
					'id' => 'pickup',
					'label' => 'Pickup',
					'methods' => array(
						array(
							'id' => 'pickup',
							'label' => 'Pickup',
							'price' => $this->api->format_money( 0 ),
						),
					),
				),
				array(
					'id' => 'delivery',
					'label' => 'Delivery',
					'methods' => $delivery_methods,
				),
			);
		}

		$payment_methods = $this->get_headless_payment_methods_payload();
		$required_pickup_fields = array( 'full_name', 'mobile_number' );
		$required_delivery_fields = array( 'full_name', 'mobile_number', 'street_address', 'city', 'state', 'postcode', 'delivery_method' );

		if ( ! empty( $payment_methods ) ) {
			$required_pickup_fields[] = 'payment_method';
			$required_delivery_fields[] = 'payment_method';
		}

		return array(
			'fulfillment_modes' => $fulfillment_modes,
			'payment_methods' => $payment_methods,
			'delivery_methods' => $delivery_methods,
			'store' => array(
				'pickup_address' => $this->get_headless_store_settings()['pickup_address'],
				'delivery_radius_km' => $this->get_headless_store_settings()['delivery_radius_km'],
				'location' => $this->get_headless_store_settings()['store_location'],
			),
			'required_fields' => array(
				'pickup' => $required_pickup_fields,
				'delivery' => $required_delivery_fields,
			),
			'estimated_times' => array(
				'pickup' => $this->get_estimated_minutes_for_storage_cart( $cart, 'pickup' ),
				'delivery' => $this->get_estimated_minutes_for_storage_cart( $cart, 'delivery' ),
			),
			'notes' => array(
				'payment' => empty( $payment_methods ) ? 'No payment gateways are currently enabled.' : 'Select an enabled WooCommerce payment method for this order.',
				'upi' => 'UPI methods appear automatically when an enabled WooCommerce gateway is mapped as UPI.',
				'auth' => 'Menu, cart, and checkout endpoints are intentionally public for the storefront. Browser apps should use HTTPS, persist X-Frankies-Cart-Token, and only send X-WP-Nonce when acting as an authenticated WordPress user.',
			),
		);
	}

	private function get_headless_enabled_fulfillment_modes_for_storage( array $cart, array $address = array() ) {
		$modes = array();
		$delivery_methods = $this->get_headless_delivery_methods( $address );

		foreach ( (array) $cart['items'] as $item ) {
			$product = wc_get_product( absint( $item['product_id'] ?? 0 ) );

			if ( ! $product instanceof WC_Product ) {
				continue;
			}

			$fulfillment = $this->build_product_fulfillment_payload( $product->get_id() );
			if ( $fulfillment['supportsPickup'] ) {
				$modes['pickup'] = array(
					'id' => 'pickup',
					'label' => 'Pickup',
					'methods' => array(
						array(
							'id' => 'pickup',
							'label' => 'Pickup',
							'price' => $this->api->format_money( 0 ),
						),
					),
				);
			}

			if ( $fulfillment['supportsDelivery'] && ! empty( $delivery_methods ) ) {
				$modes['delivery'] = array(
					'id' => 'delivery',
					'label' => 'Delivery',
					'methods' => $delivery_methods,
				);
			}
		}

		return array_values( $modes );
	}

	private function resolve_headless_checkout_cart( $token, array $payload ) {
		$cart_items = $payload['cart_items'] ?? $payload['cartItems'] ?? array();
		$normalized_items = $this->normalize_headless_client_cart_items( is_array( $cart_items ) ? $cart_items : array() );

		if ( ! empty( $normalized_items ) ) {
			return array(
				'items' => $normalized_items,
				'updated_at' => gmdate( DATE_ATOM ),
			);
		}

		return $this->get_headless_storage_cart( $token );
	}

	private function normalize_headless_client_cart_items( array $items ) {
		$normalized = array();

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$validated_item = $this->validate_headless_cart_request_item( $item );

			if ( is_wp_error( $validated_item ) ) {
				continue;
			}

			$normalized[] = array(
				'key' => sanitize_text_field( $item['key'] ?? wp_generate_uuid4() ),
				'product_id' => $validated_item['product_id'],
				'quantity' => $validated_item['quantity'],
				'spice_option' => $validated_item['spice_option'],
				'addons' => $validated_item['addons'],
				'allergies_note' => $validated_item['allergies_note'],
			);
		}

		return $normalized;
	}

	private function validate_headless_checkout_payload_for_storage( array $cart, array $payload ) {
		if ( empty( $cart['items'] ) ) {
			return new WP_Error( 'frankies_checkout_empty_cart', 'Your cart is empty.', array( 'status' => 400 ) );
		}

		$fulfillment_type = $this->sanitize_fulfillment_mode( $payload['fulfillment_type'] ?? $payload['fulfillmentType'] ?? 'pickup' );
		$full_name = sanitize_text_field( (string) ( $payload['full_name'] ?? $payload['fullName'] ?? '' ) );
		$mobile_number = sanitize_text_field( (string) ( $payload['mobile_number'] ?? $payload['mobileNumber'] ?? '' ) );
		$address = is_array( $payload['address'] ?? null ) ? $payload['address'] : array();

		if ( '' === $full_name ) {
			return new WP_Error( 'frankies_checkout_full_name_required', 'Full name is required.', array( 'status' => 422 ) );
		}

		if ( '' === $mobile_number ) {
			return new WP_Error( 'frankies_checkout_mobile_required', 'Mobile number is required.', array( 'status' => 422 ) );
		}

		$normalized_address = array(
			'street_address' => sanitize_text_field( (string) ( $address['street_address'] ?? $address['streetAddress'] ?? '' ) ),
			'city' => sanitize_text_field( (string) ( $address['city'] ?? '' ) ),
			'state' => sanitize_text_field( (string) ( $address['state'] ?? '' ) ),
			'postcode' => sanitize_text_field( (string) ( $address['postcode'] ?? '' ) ),
			'country' => sanitize_text_field( (string) ( $address['country'] ?? WC()->countries->get_base_country() ) ),
		);
		$payment_method = sanitize_key( (string) ( $payload['payment_method'] ?? $payload['paymentMethod'] ?? '' ) );
		$coupon_code = wc_format_coupon_code( (string) ( $payload['coupon_code'] ?? $payload['couponCode'] ?? '' ) );
		$tip_amount = max( 0, (float) wc_format_decimal( $payload['tip_amount'] ?? $payload['tipAmount'] ?? 0, wc_get_price_decimals() ) );

		$available_modes = wp_list_pluck( $this->get_headless_enabled_fulfillment_modes_for_storage( $cart, $normalized_address ), 'id' );
		if ( ! in_array( $fulfillment_type, $available_modes, true ) ) {
			return new WP_Error( 'frankies_checkout_invalid_fulfillment', 'Selected fulfillment type is not available for this cart.', array( 'status' => 422 ) );
		}

		if ( 'delivery' === $fulfillment_type ) {
			foreach ( array( 'street_address', 'city', 'state', 'postcode' ) as $required_field ) {
				if ( '' === $normalized_address[ $required_field ] ) {
					return new WP_Error( 'frankies_checkout_address_required', 'Delivery address is incomplete.', array( 'status' => 422 ) );
				}
			}
		}

		$delivery_method = null;

		if ( 'delivery' === $fulfillment_type ) {
			$available_delivery_methods = $this->get_headless_delivery_methods( $normalized_address );
			$requested_delivery_method = sanitize_text_field( (string) ( $payload['delivery_method'] ?? $payload['deliveryMethod'] ?? '' ) );

			if ( empty( $available_delivery_methods ) ) {
				return new WP_Error( 'frankies_checkout_delivery_unavailable', 'Delivery is not configured for this address.', array( 'status' => 422 ) );
			}

			foreach ( $available_delivery_methods as $method ) {
				if ( '' === $requested_delivery_method || $method['id'] === $requested_delivery_method ) {
					$delivery_method = $method;
					break;
				}
			}

			if ( null === $delivery_method ) {
				return new WP_Error( 'frankies_checkout_invalid_delivery_method', 'Selected delivery method is not available.', array( 'status' => 422 ) );
			}
		}

		$payment_methods = $this->get_headless_payment_methods_payload();
		if ( ! empty( $payment_methods ) ) {
			$payment_ids = wp_list_pluck( $payment_methods, 'id' );
			if ( '' === $payment_method ) {
				return new WP_Error( 'frankies_checkout_payment_required', 'Payment method is required.', array( 'status' => 422 ) );
			}

			if ( ! in_array( $payment_method, $payment_ids, true ) ) {
				return new WP_Error( 'frankies_checkout_invalid_payment_method', 'Selected payment method is not available.', array( 'status' => 422 ) );
			}
		}

		if ( '' !== $coupon_code ) {
			$coupon = new WC_Coupon( $coupon_code );

			if ( ! $coupon->get_id() ) {
				return new WP_Error( 'frankies_checkout_invalid_coupon', 'Coupon code is invalid.', array( 'status' => 422 ) );
			}
		}

		return array(
			'fulfillment_type' => $fulfillment_type,
			'full_name' => $full_name,
			'mobile_number' => $mobile_number,
			'payment_method' => $payment_method,
			'coupon_code' => $coupon_code,
			'tip_amount' => (string) wc_format_decimal( $tip_amount, wc_get_price_decimals() ),
			'address' => $normalized_address,
			'delivery_method' => $delivery_method,
			'estimated_ready_time' => gmdate( DATE_ATOM, time() + ( $this->get_estimated_minutes_for_storage_cart( $cart, $fulfillment_type ) * MINUTE_IN_SECONDS ) ),
		);
	}

	private function get_estimated_minutes_for_storage_cart( array $cart, $fulfillment_type ) {
		$defaults = array(
			'pickup' => 20,
			'delivery' => 40,
		);
		$minutes = isset( $defaults[ $fulfillment_type ] ) ? $defaults[ $fulfillment_type ] : 20;

		foreach ( (array) $cart['items'] as $item ) {
			$product = wc_get_product( absint( $item['product_id'] ?? 0 ) );

			if ( ! $product instanceof WC_Product ) {
				continue;
			}

			$minutes = max( $minutes, $this->api->get_product_estimated_prep_minutes( $product ) );
		}

		return (int) apply_filters( 'frankies_headless_estimated_minutes', $minutes, $fulfillment_type );
	}

	private function calculate_headless_storage_cart_subtotal( array $cart ) {
		$subtotal = 0.0;

		foreach ( (array) $cart['items'] as $stored_item ) {
			$product = wc_get_product( absint( $stored_item['product_id'] ?? 0 ) );

			if ( ! $product instanceof WC_Product ) {
				continue;
			}

			$base_price = (float) $product->get_regular_price();
			if ( $base_price <= 0 ) {
				$base_price = (float) $product->get_price( 'edit' );
			}

			$spice_adjustment = (float) ( $stored_item['spice_option']['price_adjustment'] ?? 0 );
			$addons_total = 0.0;

			foreach ( (array) ( $stored_item['addons'] ?? array() ) as $addon ) {
				$addons_total += (float) ( $addon['price_adjustment'] ?? 0 );
			}

			$subtotal += max( 0, $base_price + $spice_adjustment + $addons_total ) * max( 1, absint( $stored_item['quantity'] ?? 1 ) );
		}

		return (float) wc_format_decimal( $subtotal, wc_get_price_decimals() );
	}

	private function calculate_headless_coupon_discount( $coupon_code, $subtotal ) {
		$coupon_code = wc_format_coupon_code( (string) $coupon_code );

		if ( '' === $coupon_code || $subtotal <= 0 ) {
			return 0.0;
		}

		$coupon = new WC_Coupon( $coupon_code );

		if ( ! $coupon->get_id() ) {
			return 0.0;
		}

		$amount = (float) $coupon->get_amount();
		$discount = 0.0;

		switch ( $coupon->get_discount_type() ) {
			case 'percent':
				$discount = $subtotal * ( $amount / 100 );
				break;
			case 'fixed_cart':
				$discount = $amount;
				break;
			default:
				$discount = 0.0;
				break;
		}

		return (float) wc_format_decimal( min( $subtotal, max( 0, $discount ) ), wc_get_price_decimals() );
	}

	private function build_headless_checkout_pricing_payload( array $cart, array $checkout ) {
		$subtotal = $this->calculate_headless_storage_cart_subtotal( $cart );
		$discount = $this->calculate_headless_coupon_discount( $checkout['coupon_code'] ?? '', $subtotal );
		$tip = max( 0, (float) wc_format_decimal( $checkout['tip_amount'] ?? 0, wc_get_price_decimals() ) );
		$total = max( 0, $subtotal - $discount + $tip );

		return array(
			'subtotal' => $this->api->format_money( $subtotal ),
			'discount' => $this->api->format_money( $discount ),
			'tip' => $this->api->format_money( $tip ),
			'total' => $this->api->format_money( $total ),
			'coupon_code' => sanitize_text_field( (string) ( $checkout['coupon_code'] ?? '' ) ),
		);
	}

	private function create_headless_order_from_storage_cart( array $cart, array $checkout ) {
		try {
			$order = wc_create_order();

			if ( is_wp_error( $order ) ) {
				return $order;
			}

			$name_parts = preg_split( '/\s+/', trim( $checkout['full_name'] ) );
			$first_name = array_shift( $name_parts ) ?: $checkout['full_name'];
			$last_name = implode( ' ', $name_parts );

			foreach ( (array) $cart['items'] as $stored_item ) {
				$product = wc_get_product( absint( $stored_item['product_id'] ?? 0 ) );

				if ( ! $product instanceof WC_Product ) {
					continue;
				}

				$base_price = (float) $product->get_regular_price();
				if ( $base_price <= 0 ) {
					$base_price = (float) $product->get_price( 'edit' );
				}

				$spice_adjustment = (float) ( $stored_item['spice_option']['price_adjustment'] ?? 0 );
				$addons_total = 0.0;
				foreach ( (array) ( $stored_item['addons'] ?? array() ) as $addon ) {
					$addons_total += (float) ( $addon['price_adjustment'] ?? 0 );
				}

				$quantity = max( 1, absint( $stored_item['quantity'] ?? 1 ) );
				$unit_price = max( 0, $base_price + $spice_adjustment + $addons_total );
				$line_total = $unit_price * $quantity;

				$item = new WC_Order_Item_Product();
				$item->set_product( $product );
				$item->set_quantity( $quantity );
				$item->set_subtotal( $line_total );
				$item->set_total( $line_total );

				if ( ! empty( $stored_item['spice_option']['label'] ) ) {
					$item->add_meta_data( 'Spice Level', sanitize_text_field( $stored_item['spice_option']['label'] ), true );
					$item->add_meta_data( '_frankies_spice_level', wp_json_encode( $stored_item['spice_option'] ), true );
				}

				if ( ! empty( $stored_item['addons'] ) ) {
					$item->add_meta_data(
						'Add-ons',
						implode(
							', ',
							array_map(
								function( $addon ) {
									return sanitize_text_field( $addon['label'] ?? '' );
								},
								(array) $stored_item['addons']
							)
						),
						true
					);
					$item->add_meta_data( '_frankies_addons', wp_json_encode( array_values( (array) $stored_item['addons'] ) ), true );
				}

				if ( ! empty( $stored_item['allergies_note'] ) ) {
					$item->add_meta_data( 'Allergies', sanitize_textarea_field( $stored_item['allergies_note'] ), true );
					$item->add_meta_data( '_frankies_allergies_note', sanitize_textarea_field( $stored_item['allergies_note'] ), true );
				}

				$order->add_item( $item );
			}

			$billing_address = array(
				'first_name' => $first_name,
				'last_name' => $last_name,
				'phone' => $checkout['mobile_number'],
				'address_1' => 'delivery' === $checkout['fulfillment_type'] ? $checkout['address']['street_address'] : '',
				'city' => 'delivery' === $checkout['fulfillment_type'] ? $checkout['address']['city'] : '',
				'state' => 'delivery' === $checkout['fulfillment_type'] ? $checkout['address']['state'] : '',
				'postcode' => 'delivery' === $checkout['fulfillment_type'] ? $checkout['address']['postcode'] : '',
				'country' => $checkout['address']['country'],
			);

			$order->set_address( $billing_address, 'billing' );
			$order->set_address( $billing_address, 'shipping' );
			$order->update_meta_data( 'fulfillment_type', $checkout['fulfillment_type'] );
			$order->update_meta_data( 'customer_phone', $checkout['mobile_number'] );
			$order->update_meta_data( 'estimated_ready_time', $checkout['estimated_ready_time'] );
			$order->update_meta_data( '_frankies_fulfillment_type', $checkout['fulfillment_type'] );
			$order->update_meta_data( '_frankies_customer_phone', $checkout['mobile_number'] );
			$order->update_meta_data( '_frankies_estimated_ready_time', $checkout['estimated_ready_time'] );
			$order->update_meta_data( '_frankies_payment_state', 'cod' === ( $checkout['payment_method'] ?? '' ) ? 'deferred' : 'pending' );
			$order->update_meta_data( '_frankies_selected_payment_method', sanitize_key( $checkout['payment_method'] ?? '' ) );
			$order->update_meta_data( '_frankies_coupon_code', sanitize_text_field( (string) ( $checkout['coupon_code'] ?? '' ) ) );
			$order->update_meta_data( '_frankies_tip_amount', wc_format_decimal( $checkout['tip_amount'] ?? 0, wc_get_price_decimals() ) );

			if ( 'delivery' === $checkout['fulfillment_type'] && ! empty( $checkout['delivery_method'] ) ) {
				$shipping_item = new WC_Order_Item_Shipping();
				$shipping_item->set_method_id( sanitize_text_field( $checkout['delivery_method']['id'] ) );
				$shipping_item->set_method_title( sanitize_text_field( $checkout['delivery_method']['label'] ) );
				$shipping_item->set_total( (float) ( $checkout['delivery_method']['price']['raw'] ?? 0 ) );
				$order->add_item( $shipping_item );
				$order->update_meta_data( '_frankies_delivery_method', sanitize_text_field( $checkout['delivery_method']['id'] ) );
			}

			if ( ! empty( $checkout['payment_method'] ) ) {
				$gateways = WC()->payment_gateways()->payment_gateways();
				if ( ! empty( $gateways[ $checkout['payment_method'] ] ) ) {
					$order->set_payment_method( $gateways[ $checkout['payment_method'] ] );
				}
			}

			$tip_amount = max( 0, (float) wc_format_decimal( $checkout['tip_amount'] ?? 0, wc_get_price_decimals() ) );
			if ( $tip_amount > 0 ) {
				$tip_item = new WC_Order_Item_Fee();
				$tip_item->set_name( 'Tip' );
				$tip_item->set_total( $tip_amount );
				$order->add_item( $tip_item );
			}

			$order->calculate_totals( true );

			if ( ! empty( $checkout['coupon_code'] ) ) {
				$coupon_result = $order->apply_coupon( $checkout['coupon_code'] );

				if ( is_wp_error( $coupon_result ) ) {
					return $coupon_result;
				}

				$order->calculate_totals( true );
			}

			$saved_order_id = $order->save();

			if ( ! $order->get_id() && $saved_order_id ) {
				$reloaded_order = wc_get_order( $saved_order_id );
				if ( $reloaded_order instanceof WC_Order ) {
					$order = $reloaded_order;
				}
			}

			if ( ! $order->get_id() ) {
				return new WP_Error( 'frankies_checkout_order_save_failed', 'WooCommerce could not persist the order.', array( 'status' => 500 ) );
			}

			$order->update_status( 'on-hold', 'Payment integration intentionally deferred pending client confirmation.' );

			return $order;
		} catch ( Exception $exception ) {
			return new WP_Error( 'frankies_checkout_place_order_failed', $exception->getMessage(), array( 'status' => 500 ) );
		}
	}

	private function build_headless_checkout_config_payload( $cart_token, array $address = array() ) {
		$delivery_methods = $this->get_headless_delivery_methods( $address );

		return array(
			'cart' => $this->build_headless_cart_payload( $cart_token ),
			'fulfillment_modes' => $this->get_headless_enabled_fulfillment_modes( $address ),
			'payment_methods' => array(),
			'delivery_methods' => $delivery_methods,
			'required_fields' => array(
				'pickup' => array( 'full_name', 'mobile_number' ),
				'delivery' => array( 'full_name', 'mobile_number', 'street_address', 'city', 'state', 'postcode', 'delivery_method' ),
			),
			'estimated_times' => array(
				'pickup' => $this->get_estimated_minutes_for_fulfillment( 'pickup' ),
				'delivery' => $this->get_estimated_minutes_for_fulfillment( 'delivery' ),
			),
			'notes' => array(
				'payment' => 'Payment integration is intentionally disabled for now and should be finalized after client consultation.',
				'auth' => 'Menu, cart, and checkout endpoints are intentionally public for the storefront. Browser apps should use HTTPS, persist X-Frankies-Cart-Token, and only send X-WP-Nonce when acting as an authenticated WordPress user.',
			),
		);
	}

	private function get_headless_enabled_fulfillment_modes( array $address = array() ) {
		$modes = array();
		$delivery_methods = $this->get_headless_delivery_methods( $address );

		foreach ( WC()->cart->get_cart() as $cart_item ) {
			if ( empty( $cart_item['data'] ) || ! $cart_item['data'] instanceof WC_Product ) {
				continue;
			}

			$fulfillment = $this->build_product_fulfillment_payload( $cart_item['data']->get_id() );
			if ( $fulfillment['supportsPickup'] ) {
				$modes['pickup'] = array(
					'id' => 'pickup',
					'label' => 'Pickup',
					'methods' => array(
						array(
							'id' => 'pickup',
							'label' => 'Pickup',
							'price' => $this->api->format_money( 0 ),
						),
					),
				);
			}

			if ( $fulfillment['supportsDelivery'] && ! empty( $delivery_methods ) ) {
				$modes['delivery'] = array(
					'id' => 'delivery',
					'label' => 'Delivery',
					'methods' => $delivery_methods,
				);
			}
		}

		return array_values( $modes );
	}

	private function get_headless_delivery_methods( array $address = array() ) {
		$methods = array(
			array(
				'id' => 'delivery',
				'label' => 'Delivery',
				'price' => $this->api->format_money( 0 ),
			),
		);

		return array_values( apply_filters( 'frankies_headless_delivery_methods', $methods, $address ) );
	}

	private function validate_headless_checkout_payload( array $payload ) {
		if ( WC()->cart->is_empty() ) {
			return new WP_Error( 'frankies_checkout_empty_cart', 'Your cart is empty.', array( 'status' => 400 ) );
		}

		$fulfillment_type = $this->sanitize_fulfillment_mode( $payload['fulfillment_type'] ?? $payload['fulfillmentType'] ?? 'pickup' );
		$full_name = sanitize_text_field( (string) ( $payload['full_name'] ?? $payload['fullName'] ?? '' ) );
		$mobile_number = sanitize_text_field( (string) ( $payload['mobile_number'] ?? $payload['mobileNumber'] ?? '' ) );
		$address = is_array( $payload['address'] ?? null ) ? $payload['address'] : array();

		if ( '' === $full_name ) {
			return new WP_Error( 'frankies_checkout_full_name_required', 'Full name is required.', array( 'status' => 422 ) );
		}

		if ( '' === $mobile_number ) {
			return new WP_Error( 'frankies_checkout_mobile_required', 'Mobile number is required.', array( 'status' => 422 ) );
		}

		$normalized_address = array(
			'street_address' => sanitize_text_field( (string) ( $address['street_address'] ?? $address['streetAddress'] ?? '' ) ),
			'city' => sanitize_text_field( (string) ( $address['city'] ?? '' ) ),
			'state' => sanitize_text_field( (string) ( $address['state'] ?? '' ) ),
			'postcode' => sanitize_text_field( (string) ( $address['postcode'] ?? '' ) ),
			'country' => sanitize_text_field( (string) ( $address['country'] ?? WC()->countries->get_base_country() ) ),
		);

		$available_modes = wp_list_pluck( $this->get_headless_enabled_fulfillment_modes( $normalized_address ), 'id' );
		if ( ! in_array( $fulfillment_type, $available_modes, true ) ) {
			return new WP_Error( 'frankies_checkout_invalid_fulfillment', 'Selected fulfillment type is not available for this cart.', array( 'status' => 422 ) );
		}

		if ( 'delivery' === $fulfillment_type ) {
			foreach ( array( 'street_address', 'city', 'state', 'postcode' ) as $required_field ) {
				if ( '' === $normalized_address[ $required_field ] ) {
					return new WP_Error( 'frankies_checkout_address_required', 'Delivery address is incomplete.', array( 'status' => 422 ) );
				}
			}
		}

		$delivery_method = null;

		if ( 'delivery' === $fulfillment_type ) {
			$available_delivery_methods = $this->get_headless_delivery_methods( $normalized_address );
			$requested_delivery_method = sanitize_text_field( (string) ( $payload['delivery_method'] ?? $payload['deliveryMethod'] ?? '' ) );

			if ( empty( $available_delivery_methods ) ) {
				return new WP_Error( 'frankies_checkout_delivery_unavailable', 'Delivery is not configured for this address.', array( 'status' => 422 ) );
			}

			foreach ( $available_delivery_methods as $method ) {
				if ( '' === $requested_delivery_method || $method['id'] === $requested_delivery_method ) {
					$delivery_method = $method;
					break;
				}
			}

			if ( null === $delivery_method ) {
				return new WP_Error( 'frankies_checkout_invalid_delivery_method', 'Selected delivery method is not available.', array( 'status' => 422 ) );
			}
		}

		$estimated_ready = $this->calculate_estimated_ready_time( $fulfillment_type );

		return array(
			'fulfillment_type' => $fulfillment_type,
			'full_name' => $full_name,
			'mobile_number' => $mobile_number,
			'address' => $normalized_address,
			'delivery_method' => $delivery_method,
			'estimated_ready_time' => $estimated_ready,
		);
	}

	private function calculate_estimated_ready_time( $fulfillment_type ) {
		$minutes = $this->get_estimated_minutes_for_fulfillment( $fulfillment_type );
		return gmdate( DATE_ATOM, time() + ( $minutes * MINUTE_IN_SECONDS ) );
	}

	private function get_estimated_minutes_for_fulfillment( $fulfillment_type ) {
		$defaults = array(
			'pickup' => 20,
			'delivery' => 40,
		);

		$minutes = isset( $defaults[ $fulfillment_type ] ) ? $defaults[ $fulfillment_type ] : 20;

		foreach ( WC()->cart->get_cart() as $cart_item ) {
			if ( empty( $cart_item['data'] ) || ! $cart_item['data'] instanceof WC_Product ) {
				continue;
			}

			$minutes = max( $minutes, $this->api->get_product_estimated_prep_minutes( $cart_item['data'] ) );
		}

		return (int) apply_filters( 'frankies_headless_estimated_minutes', $minutes, $fulfillment_type );
	}

	private function create_headless_order_from_wc_cart( array $checkout ) {
		try {
			$order = wc_create_order();

			if ( is_wp_error( $order ) ) {
				return $order;
			}

			$name_parts = preg_split( '/\s+/', trim( $checkout['full_name'] ) );
			$first_name = array_shift( $name_parts ) ?: $checkout['full_name'];
			$last_name = implode( ' ', $name_parts );

			foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
				$product = $cart_item['data'] ?? null;
				if ( ! $product instanceof WC_Product ) {
					continue;
				}

				$item = new WC_Order_Item_Product();
				$item->set_product( $product );
				$item->set_quantity( (int) $cart_item['quantity'] );
				$item->set_subtotal( (float) $cart_item['line_subtotal'] );
				$item->set_subtotal_tax( (float) $cart_item['line_subtotal_tax'] );
				$item->set_total( (float) $cart_item['line_total'] );
				$item->set_taxes( array( 'total' => $cart_item['line_tax_data']['total'] ?? array(), 'subtotal' => $cart_item['line_tax_data']['subtotal'] ?? array() ) );
				$this->copy_headless_cart_item_meta_to_order( $item, $cart_item_key, $cart_item, $order );
				$order->add_item( $item );
			}

			$billing_address = array(
				'first_name' => $first_name,
				'last_name' => $last_name,
				'phone' => $checkout['mobile_number'],
				'address_1' => 'delivery' === $checkout['fulfillment_type'] ? $checkout['address']['street_address'] : '',
				'city' => 'delivery' === $checkout['fulfillment_type'] ? $checkout['address']['city'] : '',
				'state' => 'delivery' === $checkout['fulfillment_type'] ? $checkout['address']['state'] : '',
				'postcode' => 'delivery' === $checkout['fulfillment_type'] ? $checkout['address']['postcode'] : '',
				'country' => $checkout['address']['country'],
			);

			$order->set_address( $billing_address, 'billing' );
			$order->set_address( $billing_address, 'shipping' );
			$order->update_meta_data( 'fulfillment_type', $checkout['fulfillment_type'] );
			$order->update_meta_data( 'customer_phone', $checkout['mobile_number'] );
			$order->update_meta_data( 'estimated_ready_time', $checkout['estimated_ready_time'] );
			$order->update_meta_data( '_frankies_fulfillment_type', $checkout['fulfillment_type'] );
			$order->update_meta_data( '_frankies_customer_phone', $checkout['mobile_number'] );
			$order->update_meta_data( '_frankies_estimated_ready_time', $checkout['estimated_ready_time'] );
			$order->update_meta_data( '_frankies_payment_state', 'deferred' );

			if ( 'delivery' === $checkout['fulfillment_type'] && ! empty( $checkout['delivery_method'] ) ) {
				$shipping_item = new WC_Order_Item_Shipping();
				$shipping_item->set_method_id( sanitize_text_field( $checkout['delivery_method']['id'] ) );
				$shipping_item->set_method_title( sanitize_text_field( $checkout['delivery_method']['label'] ) );
				$shipping_item->set_total( (float) ( $checkout['delivery_method']['price']['raw'] ?? 0 ) );
				$order->add_item( $shipping_item );
				$order->update_meta_data( '_frankies_delivery_method', sanitize_text_field( $checkout['delivery_method']['id'] ) );
			}

			$order->calculate_totals( true );
			$order->save();
			$order->update_status( 'on-hold', 'Payment integration intentionally deferred pending client confirmation.' );

			return $order;
		} catch ( Exception $exception ) {
			return new WP_Error( 'frankies_checkout_place_order_failed', $exception->getMessage(), array( 'status' => 500 ) );
		}
	}

	private function build_headless_order_confirmation_payload( WC_Order $order ) {
		$items = array();

		foreach ( $order->get_items() as $item ) {
			if ( ! $item instanceof WC_Order_Item_Product ) {
				continue;
			}

			$product = $item->get_product();
			$image = $product instanceof WC_Product ? $this->api->get_product_image_payload( $product ) : array( 'url' => '', 'alt' => '' );
			$selected_options = $this->build_headless_order_item_selected_options( $item );

			$items[] = array(
				'name' => $item->get_name(),
				'quantity' => (int) $item->get_quantity(),
				'total' => $this->api->format_money( $item->get_total() + $item->get_total_tax() ),
				'image' => $image['url'],
				'selected_options' => $selected_options,
				'summary_lines' => $this->build_headless_summary_lines( $selected_options ),
			);
		}

		return array(
			'order_id' => $order->get_id(),
			'order_number' => $order->get_order_number(),
			'payment_status' => (string) ( $order->get_meta( '_frankies_payment_state', true ) ?: 'deferred' ),
			'status' => $order->get_status(),
			'fulfillment_type' => $order->get_meta( 'fulfillment_type', true ) ?: ( $order->get_meta( '_frankies_fulfillment_type', true ) ?: 'pickup' ),
			'customer_phone' => $order->get_meta( 'customer_phone', true ) ?: ( $order->get_meta( '_frankies_customer_phone', true ) ?: $order->get_billing_phone() ),
			'estimated_ready_time' => $order->get_meta( 'estimated_ready_time', true ) ?: $order->get_meta( '_frankies_estimated_ready_time', true ),
			'delivery_method' => (string) $order->get_meta( '_frankies_delivery_method', true ),
			'subtotal' => $this->api->format_money( $order->get_subtotal() ),
			'taxes' => $this->api->format_money( $order->get_total_tax() ),
			'fees' => $this->api->format_money( $order->get_total_fees() ),
			'total' => $this->api->format_money( $order->get_total() ),
			'item_summary' => $items,
			'next_actions' => $this->build_headless_order_next_actions( $order ),
		);
	}

	private function build_headless_order_item_selected_options( WC_Order_Item_Product $item ) {
		$spice_meta = $this->decode_json_meta( $item->get_meta( '_frankies_spice_level', true ) );
		$addons_meta = $this->decode_json_meta( $item->get_meta( '_frankies_addons', true ) );
		$allergies_note = sanitize_textarea_field( (string) $item->get_meta( '_frankies_allergies_note', true ) );

		$selected_options = array(
			'spice_level' => null,
			'addons' => array(),
			'allergies_note' => $allergies_note,
		);

		if ( ! empty( $spice_meta['label'] ) ) {
			$selected_options['spice_level'] = array(
				'key' => sanitize_title( $spice_meta['key'] ?? $spice_meta['label'] ),
				'label' => sanitize_text_field( $spice_meta['label'] ),
				'price_adjustment' => $this->api->format_money( $spice_meta['price_adjustment'] ?? 0 ),
			);
		} elseif ( $item->get_meta( 'Spice Level', true ) ) {
			$selected_options['spice_level'] = array(
				'key' => sanitize_title( $item->get_meta( 'Spice Level', true ) ),
				'label' => sanitize_text_field( $item->get_meta( 'Spice Level', true ) ),
				'price_adjustment' => $this->api->format_money( 0 ),
			);
		}

		foreach ( (array) $addons_meta as $addon ) {
			if ( empty( $addon['label'] ) ) {
				continue;
			}

			$selected_options['addons'][] = array(
				'key' => sanitize_title( $addon['key'] ?? $addon['label'] ),
				'label' => sanitize_text_field( $addon['label'] ),
				'price_adjustment' => $this->api->format_money( $addon['price_adjustment'] ?? 0 ),
			);
		}

		if ( empty( $selected_options['addons'] ) && $item->get_meta( 'Add-ons', true ) ) {
			foreach ( array_map( 'trim', explode( ',', (string) $item->get_meta( 'Add-ons', true ) ) ) as $addon_label ) {
				if ( '' === $addon_label ) {
					continue;
				}

				$selected_options['addons'][] = array(
					'key' => sanitize_title( $addon_label ),
					'label' => sanitize_text_field( $addon_label ),
					'price_adjustment' => $this->api->format_money( 0 ),
				);
			}
		}

		return $selected_options;
	}

	private function build_headless_order_next_actions( WC_Order $order ) {
		$payment_method = sanitize_key( (string) $order->get_payment_method() );

		return array(
			array(
				'type' => 'confirmation',
				'label' => 'Order received',
				'status' => 'complete',
			),
			array(
				'type' => 'payment',
				'label' => 'cod' === $payment_method ? 'Pay on pickup or delivery' : 'Payment pending',
				'status' => 'pending',
			),
		);
	}

	private function get_headless_payment_methods_payload() {
		if ( ! function_exists( 'WC' ) || ! WC()->payment_gateways() ) {
			return array();
		}

		$gateways = WC()->payment_gateways()->payment_gateways();
		$payload = array();

		foreach ( $gateways as $gateway ) {
			if ( empty( $gateway->id ) || 'yes' !== $gateway->enabled ) {
				continue;
			}

			$payload[] = array(
				'id' => sanitize_key( $gateway->id ),
				'type' => $this->map_headless_payment_method_type( $gateway->id ),
				'label' => wp_strip_all_tags( $gateway->get_title() ),
				'description' => wp_strip_all_tags( $gateway->get_description() ),
				'enabled' => true,
			);
		}

		return array_values( $payload );
	}

	private function map_headless_payment_method_type( $gateway_id ) {
		$gateway_id = sanitize_key( (string) $gateway_id );

		if ( in_array( $gateway_id, array( 'cod', 'cash_on_delivery' ), true ) ) {
			return 'cash_on_delivery';
		}

		if ( false !== strpos( $gateway_id, 'upi' ) ) {
			return 'upi';
		}

		return 'card';
	}

	private function get_headless_store_settings() {
		$pickup_address = sanitize_text_field( (string) get_option( 'frankies_headless_pickup_address', '' ) );
		if ( '' === $pickup_address ) {
			$pickup_address = trim(
				implode(
					', ',
					array_filter(
						array(
							get_option( 'woocommerce_store_address', '' ),
							get_option( 'woocommerce_store_city', '' ),
							get_option( 'woocommerce_store_state', '' ),
							get_option( 'woocommerce_store_postcode', '' ),
							get_option( 'woocommerce_default_country', '' ),
						)
					)
				)
			);
		}

		$lat = get_option( 'frankies_headless_store_latitude', '' );
		$lng = get_option( 'frankies_headless_store_longitude', '' );

		return array(
			'pickup_address' => $pickup_address,
			'delivery_radius_km' => (float) get_option( 'frankies_headless_delivery_radius_km', 0 ),
			'store_location' => ( '' !== (string) $lat && '' !== (string) $lng ) ? array(
				'lat' => (float) $lat,
				'lng' => (float) $lng,
			) : null,
		);
	}

	private function calculate_haversine_distance_km( $lat1, $lng1, $lat2, $lng2 ) {
		$earth_radius = 6371.0;
		$lat_delta = deg2rad( $lat2 - $lat1 );
		$lng_delta = deg2rad( $lng2 - $lng1 );
		$a = sin( $lat_delta / 2 ) * sin( $lat_delta / 2 ) + cos( deg2rad( $lat1 ) ) * cos( deg2rad( $lat2 ) ) * sin( $lng_delta / 2 ) * sin( $lng_delta / 2 );
		$c = 2 * atan2( sqrt( $a ), sqrt( 1 - $a ) );

		return $earth_radius * $c;
	}

	private function get_or_create_cart_token( WP_REST_Request $request, $create_if_missing ) {
		$token = (string) $request->get_header( self::CART_HEADER );

		if ( '' === $token ) {
			$token = sanitize_text_field( (string) $request->get_param( 'cartToken' ) );
		}

		if ( '' === $token ) {
			$token = sanitize_text_field( (string) $request->get_param( 'cart_token' ) );
		}

		if ( '' === $token && isset( $_REQUEST['cartToken'] ) ) {
			$token = sanitize_text_field( (string) wp_unslash( $_REQUEST['cartToken'] ) );
		}

		if ( '' === $token && isset( $_REQUEST['cart_token'] ) ) {
			$token = sanitize_text_field( (string) wp_unslash( $_REQUEST['cart_token'] ) );
		}

		if ( '' === $token ) {
			$json_params = $request->get_json_params();

			if ( is_array( $json_params ) ) {
				$token = sanitize_text_field( (string) ( $json_params['cartToken'] ?? $json_params['cart_token'] ?? '' ) );
			}
		}

		if ( '' === $token ) {
			foreach ( (array) $request->get_params() as $key => $value ) {
				$normalized_key = strtolower( str_replace( array( '-', '_' ), '', (string) $key ) );

				if ( 'carttoken' !== $normalized_key ) {
					continue;
				}

				$token = sanitize_text_field( (string) $value );
				break;
			}
		}

		if ( '' === $token && $create_if_missing ) {
			$token = wp_generate_uuid4();
		}

		return sanitize_text_field( $token );
	}

	private function get_cart( $token ) {
		if ( '' === $token ) {
			return array(
				'items' => array(),
			);
		}

		$cart = get_transient( $this->get_cart_storage_key( $token ) );

		if ( ! is_array( $cart ) || ! isset( $cart['items'] ) || ! is_array( $cart['items'] ) ) {
			return array(
				'items' => array(),
			);
		}

		return $cart;
	}

	private function save_cart( $token, array $cart ) {
		$cart['updatedAt'] = gmdate( DATE_ATOM );
		set_transient( $this->get_cart_storage_key( $token ), $cart, self::CART_TTL );
	}

	private function get_cart_storage_key( $token ) {
		return 'frankies_cart_' . md5( $token );
	}

	private function build_cart_payload( $token, array $cart ) {
		$items = array();
		$subtotal = 0.0;
		$item_count = 0;
		$supports_pickup = false;
		$supports_delivery = false;

		foreach ( $cart['items'] as $item ) {
			$product = wc_get_product( absint( $item['productId'] ) );

			if ( ! $product instanceof WC_Product ) {
				continue;
			}

			$base_price = (float) $product->get_price();
			$add_on_total = 0.0;
			$mapped_add_ons = array();

			foreach ( (array) $item['addOns'] as $add_on ) {
				$price = (float) $add_on['price_adjustment'];
				$add_on_total += $price;
				$mapped_add_ons[] = array(
					'key'              => $add_on['key'],
					'label'            => $add_on['label'],
					'price_adjustment' => $this->api->format_money( $price ),
					'product_id'       => absint( $add_on['product_id'] ?? 0 ),
				);
			}

			$line_total = ( $base_price + $add_on_total ) * (int) $item['quantity'];
			$subtotal += $line_total;
			$item_count += (int) $item['quantity'];

			$fulfillment = $this->build_product_fulfillment_payload( $product->get_id() );
			$supports_pickup = $supports_pickup || $fulfillment['supportsPickup'];
			$supports_delivery = $supports_delivery || $fulfillment['supportsDelivery'];

			$card = $this->api->map_product_card( $product );

			$items[] = array(
				'key'        => $item['key'],
				'productId'  => $product->get_id(),
				'slug'       => $product->get_slug(),
				'title'      => $product->get_name(),
				'quantity'   => (int) $item['quantity'],
				'image'      => array(
					'url' => $card['image'],
					'alt' => $card['image_alt'],
				),
				'unitPrice'  => $this->api->format_money( $base_price ),
				'spiceLevel' => $item['spiceLevel'],
				'addOns'     => $mapped_add_ons,
				'lineTotal'  => $this->api->format_money( $line_total ),
			);
		}

		return array(
			'cartToken'      => $token,
			'currency'       => get_woocommerce_currency(),
			'itemCount'      => $item_count,
			'availableModes' => array_values(
				array_filter(
					array(
						$supports_pickup ? 'pickup' : null,
						$supports_delivery ? 'delivery' : null,
					)
				)
			),
			'items'          => $items,
			'totals'         => array(
				'subtotal' => $this->api->format_money( $subtotal ),
				'fees'     => $this->api->format_money( 0 ),
				'shipping' => $this->api->format_money( 0 ),
				'tax'      => $this->api->format_money( 0 ),
				'total'    => $this->api->format_money( $subtotal ),
			),
			'updatedAt'      => $cart['updatedAt'] ?? gmdate( DATE_ATOM ),
		);
	}

	private function get_fulfillment_modes( array $cart, $shipping_address ) {
		$cart_payload = $this->build_cart_payload( '', $cart );
		$modes = array();

		if ( in_array( 'pickup', $cart_payload['availableModes'], true ) ) {
			$modes[] = array(
				'id'      => 'pickup',
				'label'   => 'Pickup',
				'methods' => array(
					array(
						'id'    => 'pickup',
						'label' => 'Pickup in store',
						'price' => $this->api->format_money( 0 ),
					),
				),
			);
		}

		if ( in_array( 'delivery', $cart_payload['availableModes'], true ) ) {
			$modes[] = array(
				'id'      => 'delivery',
				'label'   => 'Delivery',
				'methods' => $this->get_shipping_methods_payload( $shipping_address ),
			);
		}

		return $modes;
	}

	private function get_shipping_methods_payload( $shipping_address ) {
		$shipping_address = is_array( $shipping_address ) ? $shipping_address : array();
		$package = array(
			'destination' => array(
				'country'   => sanitize_text_field( $shipping_address['country'] ?? WC()->countries->get_base_country() ),
				'state'     => sanitize_text_field( $shipping_address['state'] ?? '' ),
				'postcode'  => sanitize_text_field( $shipping_address['postcode'] ?? '' ),
				'city'      => sanitize_text_field( $shipping_address['city'] ?? '' ),
				'address'   => sanitize_text_field( $shipping_address['address1'] ?? '' ),
				'address_2' => sanitize_text_field( $shipping_address['address2'] ?? '' ),
			),
		);

		$zone = WC_Shipping_Zones::get_zone_matching_package( $package );
		$methods = $zone ? $zone->get_shipping_methods( true ) : array();

		if ( empty( $methods ) ) {
			$methods = WC_Shipping_Zones::get_zone( 0 )->get_shipping_methods( true );
		}

		$payload = array();

		foreach ( $methods as $method ) {
			if ( empty( $method->enabled ) || 'yes' !== $method->enabled ) {
				continue;
			}

			$cost = 0;
			if ( isset( $method->cost ) ) {
				$cost = (float) $method->cost;
			} elseif ( method_exists( $method, 'get_option' ) ) {
				$cost = (float) $method->get_option( 'cost', 0 );
			}

			$payload[] = array(
				'id'    => $method->id . ':' . $method->instance_id,
				'label' => $method->get_title(),
				'price' => $this->api->format_money( $cost ),
			);
		}

		return array_values( $payload );
	}

	private function get_payment_methods_payload() {
		$gateways = WC()->payment_gateways()->payment_gateways();
		$payload = array();

		foreach ( $gateways as $gateway ) {
			if ( 'yes' !== $gateway->enabled ) {
				continue;
			}

			$payload[] = array(
				'id'                        => $gateway->id,
				'title'                     => wp_strip_all_tags( $gateway->get_title() ),
				'description'               => wp_kses_post( $gateway->get_description() ),
				'requiresClientIntegration' => (bool) $gateway->has_fields(),
			);
		}

		return array_values( $payload );
	}

	private function create_order_from_cart( array $cart, array $payload ) {
		$fulfillment = $payload['fulfillment'] ?? array();
		$mode = $this->sanitize_fulfillment_mode( $fulfillment['mode'] ?? 'pickup' );
		$payment_method = sanitize_key( $payload['paymentMethod'] ?? '' );
		$customer = is_array( $payload['customer'] ?? null ) ? $payload['customer'] : array();
		$billing = is_array( $payload['billingAddress'] ?? null ) ? $payload['billingAddress'] : array();
		$shipping = is_array( $payload['shippingAddress'] ?? null ) ? $payload['shippingAddress'] : array();

		$order = wc_create_order();

		if ( is_wp_error( $order ) ) {
			return $order;
		}

		try {
			foreach ( $cart['items'] as $item ) {
				$product = wc_get_product( absint( $item['productId'] ) );

				if ( ! $product instanceof WC_Product ) {
					continue;
				}

				$item_id = $order->add_product( $product, (int) $item['quantity'] );

				if ( ! empty( $item['spiceLevel'] ) ) {
					wc_add_order_item_meta( $item_id, 'Spice Level', sanitize_text_field( $item['spiceLevel'] ) );
				}

				if ( ! empty( $item['addOns'] ) ) {
					wc_add_order_item_meta(
						$item_id,
						'Add-ons',
						implode(
							', ',
							array_map(
								function( $add_on ) {
									return sanitize_text_field( $add_on['label'] );
								},
								$item['addOns']
							)
						)
					);

					foreach ( $item['addOns'] as $add_on ) {
						$fee = new WC_Order_Item_Fee();
						$fee->set_name( 'Add-on: ' . sanitize_text_field( $add_on['label'] ) );
						$fee->set_amount( (float) $add_on['price_adjustment'] * (int) $item['quantity'] );
						$fee->set_total( (float) $add_on['price_adjustment'] * (int) $item['quantity'] );
						$order->add_item( $fee );
					}
				}
			}

			$billing_address = $this->map_order_address( $customer, $billing );
			$shipping_address = 'delivery' === $mode ? $this->map_order_address( $customer, $shipping ) : $billing_address;

			$order->set_address( $billing_address, 'billing' );
			$order->set_address( $shipping_address, 'shipping' );
			$order->update_meta_data( '_frankies_fulfillment_mode', $mode );
			$order->set_customer_note( sanitize_textarea_field( $payload['note'] ?? '' ) );

			if ( 'delivery' === $mode ) {
				$shipping_method = $this->resolve_shipping_method(
					sanitize_text_field( $fulfillment['methodId'] ?? '' ),
					$shipping_address
				);

				if ( is_wp_error( $shipping_method ) ) {
					return $shipping_method;
				}

				$shipping_item = new WC_Order_Item_Shipping();
				$shipping_item->set_method_id( $shipping_method['id'] );
				$shipping_item->set_method_title( $shipping_method['label'] );
				$shipping_item->set_total( (float) $shipping_method['cost'] );
				$order->add_item( $shipping_item );
			}

			$gateways = WC()->payment_gateways()->payment_gateways();
			if ( empty( $gateways[ $payment_method ] ) ) {
				return new WP_Error( 'frankies_invalid_payment_method', 'Invalid payment method.', array( 'status' => 422 ) );
			}

			$gateway = $gateways[ $payment_method ];
			$order->set_payment_method( $gateway );
			$order->calculate_totals( true );
			$order->save();

			if ( method_exists( $gateway, 'process_payment' ) ) {
				$result = $gateway->process_payment( $order->get_id() );
				if ( is_array( $result ) && ! empty( $result['result'] ) && 'success' === $result['result'] && ! empty( $result['redirect'] ) ) {
					$order->update_meta_data( '_frankies_payment_redirect', esc_url_raw( $result['redirect'] ) );
					$order->save();
				}
			}
		} catch ( Exception $exception ) {
			return new WP_Error( 'frankies_checkout_failed', $exception->getMessage(), array( 'status' => 500 ) );
		}

		return $order;
	}

	private function resolve_shipping_method( $method_id, array $shipping_address ) {
		$methods = $this->get_shipping_methods_payload(
			array(
				'country'  => $shipping_address['country'] ?? '',
				'state'    => $shipping_address['state'] ?? '',
				'postcode' => $shipping_address['postcode'] ?? '',
				'city'     => $shipping_address['city'] ?? '',
				'address1' => $shipping_address['address_1'] ?? '',
				'address2' => $shipping_address['address_2'] ?? '',
			)
		);

		foreach ( $methods as $method ) {
			if ( $method['id'] === $method_id ) {
				return array(
					'id'    => $method['id'],
					'label' => $method['label'],
					'cost'  => $method['price']['raw'],
				);
			}
		}

		return new WP_Error( 'frankies_invalid_shipping_method', 'Invalid shipping method.', array( 'status' => 422 ) );
	}

	private function map_order_address( array $customer, array $address ) {
		return array(
			'first_name' => sanitize_text_field( $customer['firstName'] ?? '' ),
			'last_name'  => sanitize_text_field( $customer['lastName'] ?? '' ),
			'company'    => '',
			'email'      => sanitize_email( $customer['email'] ?? '' ),
			'phone'      => sanitize_text_field( $customer['phone'] ?? '' ),
			'address_1'  => sanitize_text_field( $address['address1'] ?? '' ),
			'address_2'  => sanitize_text_field( $address['address2'] ?? '' ),
			'city'       => sanitize_text_field( $address['city'] ?? '' ),
			'state'      => sanitize_text_field( $address['state'] ?? '' ),
			'postcode'   => sanitize_text_field( $address['postcode'] ?? '' ),
			'country'    => sanitize_text_field( $address['country'] ?? WC()->countries->get_base_country() ),
		);
	}

	private function build_order_confirmation_payload( WC_Order $order ) {
		$items = array();

		foreach ( $order->get_items() as $item ) {
			if ( ! $item instanceof WC_Order_Item_Product ) {
				continue;
			}

			$product = $item->get_product();
			$image = $product instanceof WC_Product ? $this->api->get_product_image_payload( $product ) : array( 'url' => '', 'alt' => '' );

			$items[] = array(
				'productId'   => $product ? $product->get_id() : 0,
				'title'       => $item->get_name(),
				'quantity'    => (int) $item->get_quantity(),
				'total'       => $this->api->format_money( $item->get_total() ),
				'image'       => $image,
				'spiceLevel'  => $item->get_meta( 'Spice Level', true ),
				'addOnsLabel' => $item->get_meta( 'Add-ons', true ),
			);
		}

		return array(
			'orderId'         => $order->get_id(),
			'orderNumber'     => $order->get_order_number(),
			'status'          => $order->get_status(),
			'paymentMethod'   => $order->get_payment_method_title(),
			'fulfillmentMode' => $order->get_meta( '_frankies_fulfillment_mode', true ) ?: 'pickup',
			'customer'        => array(
				'firstName' => $order->get_billing_first_name(),
				'lastName'  => $order->get_billing_last_name(),
				'email'     => $order->get_billing_email(),
				'phone'     => $order->get_billing_phone(),
			),
			'items'           => $items,
			'totals'          => array(
				'subtotal' => $this->api->format_money( $order->get_subtotal() ),
				'shipping' => $this->api->format_money( $order->get_shipping_total() ),
				'tax'      => $this->api->format_money( $order->get_total_tax() ),
				'total'    => $this->api->format_money( $order->get_total() ),
			),
			'createdAt'       => $order->get_date_created() ? $order->get_date_created()->date( DATE_ATOM ) : gmdate( DATE_ATOM ),
			'paymentRedirect' => (string) $order->get_meta( '_frankies_payment_redirect', true ),
		);
	}
}

if ( ! function_exists( 'wc_get_product_id_by_slug' ) ) {
	function wc_get_product_id_by_slug( $slug ) {
		$product = get_page_by_path( $slug, OBJECT, 'product' );
		return $product instanceof WP_Post ? (int) $product->ID : 0;
	}
}
