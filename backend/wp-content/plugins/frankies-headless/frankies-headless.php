<?php
/**
 * Plugin Name: Frankies Headless
 * Description: Headless CMS models, REST bootstrap API, preview flow, and hardening for Frankie's Breakfast Burritos.
 * Version: 1.0.3
 * Author: Codex
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Frankies_Headless_Plugin {
	const OPTION_KEY = 'frankies_headless_settings';
	const PREVIEW_HEADER = 'x_frankies_preview_token';
	const REVALIDATE_HEADER = 'x_frankies_revalidate_secret';
	const CACHE_VERSION_KEY = 'frankies_headless_cache_version';
	const PUBLIC_CACHE_TTL = 300;
	const PLUGIN_VERSION = '1.0.3';

	/**
	 * @var Frankies_Headless_Plugin|null
	 */
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		if ( ! get_option( self::OPTION_KEY ) ) {
			add_option( self::OPTION_KEY, $this->default_settings() );
		}

		add_action( 'after_setup_theme', array( $this, 'register_theme_support' ) );
		add_action( 'init', array( $this, 'register_content_models' ) );
		add_action( 'init', array( $this, 'register_navigation_menus' ) );
		add_action( 'init', array( $this, 'register_meta' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
		add_action( 'admin_menu', array( $this, 'register_admin_page' ) );
		add_action( 'admin_menu', array( $this, 'cleanup_admin_menu' ), 99 );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_init', array( $this, 'configure_headless_runtime' ) );
		add_action( 'add_meta_boxes', array( $this, 'register_meta_boxes' ) );
		add_action( 'save_post_menu_item', array( $this, 'save_menu_item_meta' ) );
		add_action( 'save_post_testimonial', array( $this, 'save_testimonial_meta' ) );
		add_action( 'save_post_post', array( $this, 'save_seo_meta_box' ) );
		add_action( 'save_post_page', array( $this, 'save_seo_meta_box' ) );
		add_action( 'menu_category_add_form_fields', array( $this, 'render_menu_category_add_fields' ) );
		add_action( 'menu_category_edit_form_fields', array( $this, 'render_menu_category_edit_fields' ) );
		add_action( 'created_menu_category', array( $this, 'save_menu_category_meta' ) );
		add_action( 'edited_menu_category', array( $this, 'save_menu_category_meta' ) );
		add_action( 'update_option_' . self::OPTION_KEY, array( $this, 'trigger_frontend_revalidation' ), 10, 2 );
		add_action( 'save_post_menu_item', array( $this, 'trigger_frontend_revalidation' ), 20, 0 );
		add_action( 'save_post_testimonial', array( $this, 'trigger_frontend_revalidation' ), 20, 0 );
		add_action( 'edited_menu_category', array( $this, 'trigger_frontend_revalidation' ), 20, 0 );
		add_action( 'update_option_' . self::OPTION_KEY, array( $this, 'purge_public_cache' ), 20, 2 );
		add_action( 'save_post_menu_item', array( $this, 'purge_public_cache' ), 30, 0 );
		add_action( 'save_post_testimonial', array( $this, 'purge_public_cache' ), 30, 0 );
		add_action( 'save_post_post', array( $this, 'purge_public_cache' ), 30, 0 );
		add_action( 'save_post_page', array( $this, 'purge_public_cache' ), 30, 0 );
		add_action( 'edited_menu_category', array( $this, 'purge_public_cache' ), 30, 0 );
		add_action( 'created_menu_category', array( $this, 'purge_public_cache' ), 30, 0 );
		add_action( 'wp_update_nav_menu', array( $this, 'purge_public_cache' ), 30, 0 );
		add_filter( 'xmlrpc_enabled', '__return_false' );
		add_filter( 'the_generator', '__return_empty_string' );
		add_filter( 'rest_endpoints', array( $this, 'filter_rest_endpoints' ) );
		add_filter( 'use_block_editor_for_post_type', array( $this, 'use_block_editor_for_post_type' ), 10, 2 );
		add_filter( 'comments_open', '__return_false', 20, 2 );
		add_filter( 'pings_open', '__return_false', 20, 2 );
		add_filter( 'wp_robots', array( $this, 'filter_wp_robots' ) );
	}

	public static function activate() {
		$instance = self::instance();
		$instance->register_theme_support();
		$instance->register_content_models();
		$instance->register_navigation_menus();

		if ( ! get_option( self::OPTION_KEY ) ) {
			add_option( self::OPTION_KEY, $instance->default_settings() );
		}

		if ( ! get_option( self::CACHE_VERSION_KEY ) ) {
			add_option( self::CACHE_VERSION_KEY, 1, '', false );
		}

		if ( ! get_option( 'permalink_structure' ) ) {
			update_option( 'permalink_structure', '/%postname%/' );
		}

		flush_rewrite_rules();
	}

	public static function deactivate() {
		flush_rewrite_rules();
	}

	public function register_content_models() {
		register_post_type(
			'testimonial',
			array(
				'labels'       => array(
					'name'          => 'Testimonials',
					'singular_name' => 'Testimonial',
				),
				'public'              => false,
				'show_ui'             => true,
				'show_in_menu'        => true,
				'show_in_rest'        => false,
				'supports'            => array( 'title', 'page-attributes' ),
				'menu_icon'           => 'dashicons-format-quote',
				'exclude_from_search' => true,
			)
		);
	}

	public function register_theme_support() {
		add_theme_support( 'post-thumbnails' );
		add_theme_support( 'menus' );
	}

	public function register_navigation_menus() {
		register_nav_menus(
			array(
				'primary_navigation' => 'Primary Navigation',
				'footer_navigation'  => 'Footer Navigation',
			)
		);
	}

	public function register_meta() {
		$menu_meta = array(
			'description'   => 'string',
			'price'         => 'string',
			'order_url'     => 'string',
			'is_featured'   => 'boolean',
			'featured_dark' => 'boolean',
		);

		foreach ( $menu_meta as $key => $type ) {
			register_post_meta(
				'menu_item',
				'_frankies_' . $key,
				array(
					'single'            => true,
					'type'              => $type,
					'show_in_rest'      => true,
					'sanitize_callback' => 'rest_sanitize_value_from_schema',
					'auth_callback'     => function() {
						return current_user_can( 'edit_posts' );
					},
				)
			);
		}

		foreach ( array( 'body', 'source_label' ) as $key ) {
			register_post_meta(
				'testimonial',
				'_frankies_' . $key,
				array(
					'single'            => true,
					'type'              => 'string',
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_textarea_field',
					'auth_callback'     => function() {
						return current_user_can( 'edit_posts' );
					},
				)
			);
		}

		$seo_meta = array(
			'seo_title'       => 'string',
			'seo_description' => 'string',
			'og_image'        => 'string',
			'noindex'         => 'boolean',
		);

		foreach ( array( 'post', 'page' ) as $post_type ) {
			foreach ( $seo_meta as $key => $type ) {
				register_post_meta(
					$post_type,
					'_frankies_' . $key,
					array(
						'single'            => true,
						'type'              => $type,
						'show_in_rest'      => false,
						'sanitize_callback' => 'boolean' === $type ? array( $this, 'sanitize_checkbox_meta' ) : ( 'string' === $type ? 'sanitize_text_field' : 'sanitize_text_field' ),
						'auth_callback'     => function() {
							return current_user_can( 'edit_posts' );
						},
					)
				);
			}
		}
	}

	public function register_rest_routes() {
		register_rest_route(
			'frankies/v1',
			'/bootstrap',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'rest_bootstrap' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			'frankies/v1',
			'/settings',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'rest_settings' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			'frankies/v1',
			'/navigation',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'rest_navigation' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			'frankies/v1',
			'/preview',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'rest_preview' ),
				'permission_callback' => array( $this, 'can_access_preview' ),
			)
		);

		register_rest_route(
			'frankies/v1',
			'/revalidate',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'rest_revalidate' ),
				'permission_callback' => array( $this, 'can_revalidate' ),
			)
		);

		register_rest_route(
			'frankies/v1',
			'/posts',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'rest_posts' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			'frankies/v1',
			'/posts/(?P<slug>[a-zA-Z0-9-_]+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'rest_post' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			'frankies/v1',
			'/pages',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'rest_pages' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			'frankies/v1',
			'/pages/(?P<slug>[a-zA-Z0-9-_]+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'rest_page' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	public function rest_bootstrap() {
		$data = $this->get_cached_public_payload(
			'bootstrap',
			function() {
				return $this->build_bootstrap_payload( false );
			}
		);

		return $this->finalize_rest_response( $data, false );
	}

	public function rest_settings() {
		$data = $this->get_cached_public_payload(
			'settings',
			function() {
				return $this->build_settings_payload();
			}
		);

		return $this->finalize_rest_response( $data, false );
	}

	public function rest_navigation() {
		$data = $this->get_cached_public_payload(
			'navigation',
			function() {
				return array(
					'primary' => $this->get_navigation_items( 'primary_navigation' ),
					'footer'  => $this->get_navigation_items( 'footer_navigation' ),
				);
			}
		);

		return $this->finalize_rest_response( $data, false );
	}

	public function rest_preview() {
		return $this->finalize_rest_response( $this->build_bootstrap_payload( true ), true );
	}

	public function rest_revalidate() {
		$result = $this->dispatch_frontend_revalidation();

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'ok'      => true,
				'message' => 'Frontend revalidation request sent.',
				'status'  => wp_remote_retrieve_response_code( $result ),
			)
		);
	}

	public function rest_posts( WP_REST_Request $request ) {
		$preview = $this->request_allows_preview( $request );
		$page = max( 1, (int) $request->get_param( 'page' ) );
		$per_page = min( 12, max( 1, (int) ( $request->get_param( 'per_page' ) ?: 10 ) ) );
		$category = sanitize_title( (string) $request->get_param( 'category' ) );
		$tag = sanitize_title( (string) $request->get_param( 'tag' ) );
		$search = sanitize_text_field( (string) $request->get_param( 'search' ) );

		$args = array(
			'post_type'      => 'post',
			'post_status'    => $this->get_public_post_statuses( $preview ),
			'posts_per_page' => $per_page,
			'paged'          => $page,
			's'              => $search,
			'orderby'        => array(
				'date' => 'DESC',
			),
		);

		$tax_query = array();
		if ( $category ) {
			$tax_query[] = array(
				'taxonomy' => 'category',
				'field'    => 'slug',
				'terms'    => $category,
			);
		}

		if ( $tag ) {
			$tax_query[] = array(
				'taxonomy' => 'post_tag',
				'field'    => 'slug',
				'terms'    => $tag,
			);
		}

		if ( ! empty( $tax_query ) ) {
			$args['tax_query'] = $tax_query;
		}

		$cache_key = sprintf( 'posts:%d:%d:%s:%s:%s', $page, $per_page, $category, $tag, $search );
		$data = $preview
			? $this->build_posts_archive_payload( $args, $page, $per_page, $category, $tag, $search )
			: $this->get_cached_public_payload(
				$cache_key,
				function() use ( $args, $page, $per_page, $category, $tag, $search ) {
					return $this->build_posts_archive_payload( $args, $page, $per_page, $category, $tag, $search );
				}
			);

		return $this->finalize_rest_response( $data, $preview );
	}

	private function build_posts_archive_payload( $args, $page, $per_page, $category, $tag, $search ) {
		$query = new WP_Query( $args );

		return array(
			'items'       => array_map( array( $this, 'map_post_to_archive_item' ), $query->posts ),
			'pagination'  => array(
				'page'       => $page,
				'perPage'    => $per_page,
				'totalItems' => (int) $query->found_posts,
				'totalPages' => (int) $query->max_num_pages,
			),
			'filters'     => array(
				'category' => $category,
				'tag'      => $tag,
				'search'   => $search,
			),
			'categories'  => $this->get_term_archive_items( 'category' ),
			'tags'        => $this->get_term_archive_items( 'post_tag' ),
		);
	}

	public function rest_post( WP_REST_Request $request ) {
		$preview = $this->request_allows_preview( $request );
		$post = $this->get_post_by_slug( 'post', (string) $request['slug'], $preview );
		if ( ! $post ) {
			return new WP_Error( 'frankies_post_not_found', 'Post not found.', array( 'status' => 404 ) );
		}

		$data = $preview
			? $this->map_post_to_single_item( $post )
			: $this->get_cached_public_payload(
				'post:' . $post->post_name,
				function() use ( $post ) {
					return $this->map_post_to_single_item( $post );
				}
			);

		return $this->finalize_rest_response( $data, $preview );
	}

	public function rest_page( WP_REST_Request $request ) {
		$preview = $this->request_allows_preview( $request );
		$page = $this->get_post_by_slug( 'page', (string) $request['slug'], $preview );
		if ( ! $page ) {
			return new WP_Error( 'frankies_page_not_found', 'Page not found.', array( 'status' => 404 ) );
		}

		$data = $preview
			? $this->map_page_to_item( $page )
			: $this->get_cached_public_payload(
				'page:' . $page->post_name,
				function() use ( $page ) {
					return $this->map_page_to_item( $page );
				}
			);

		return $this->finalize_rest_response( $data, $preview );
	}

	public function rest_pages( WP_REST_Request $request ) {
		$preview = $this->request_allows_preview( $request );
		$data = $preview
			? $this->build_pages_archive_payload( $preview )
			: $this->get_cached_public_payload(
				'pages',
				function() use ( $preview ) {
					return $this->build_pages_archive_payload( $preview );
				}
			);

		return $this->finalize_rest_response( $data, $preview );
	}

	private function build_pages_archive_payload( $preview ) {
		$pages = get_posts(
			array(
				'post_type'      => 'page',
				'post_status'    => $this->get_public_post_statuses( $preview ),
				'posts_per_page' => -1,
				'post_parent'    => 0,
				'orderby'        => array(
					'menu_order' => 'ASC',
					'title'      => 'ASC',
				),
			)
		);

		return array(
			'items' => array_map( array( $this, 'map_page_to_archive_item' ), $pages ),
		);
	}

	private function get_cached_public_payload( $cache_key, $builder ) {
		$transient_key = 'frnk_' . md5( self::PLUGIN_VERSION . '|' . $this->get_cache_version() . '|' . $cache_key );
		$cached = get_transient( $transient_key );

		if ( false !== $cached ) {
			return $cached;
		}

		$value = is_callable( $builder ) ? call_user_func( $builder ) : null;
		set_transient( $transient_key, $value, self::PUBLIC_CACHE_TTL );

		return $value;
	}

	private function get_cache_version() {
		return max( 1, (int) get_option( self::CACHE_VERSION_KEY, 1 ) );
	}

	public function purge_public_cache( ...$args ) {
		update_option( self::CACHE_VERSION_KEY, $this->get_cache_version() + 1, false );
	}

	private function finalize_rest_response( $data, $preview = false ) {
		$response = rest_ensure_response( $data );

		if ( $preview ) {
			$response->header( 'Cache-Control', 'private, no-store, max-age=0' );
			$response->header( 'Vary', 'x-frankies-preview-token' );
			return $response;
		}

		$payload = wp_json_encode( $data );
		$etag = '"' . md5( (string) $payload ) . '"';
		$if_none_match = isset( $_SERVER['HTTP_IF_NONE_MATCH'] ) ? trim( sanitize_text_field( wp_unslash( $_SERVER['HTTP_IF_NONE_MATCH'] ) ) ) : '';

		$response->header( 'Cache-Control', 'public, max-age=60, s-maxage=' . self::PUBLIC_CACHE_TTL . ', stale-while-revalidate=600' );
		$response->header( 'ETag', $etag );

		if ( $if_none_match && $if_none_match === $etag ) {
			$response->set_status( 304 );
			$response->set_data( null );
		}

		return $response;
	}

	public function can_access_preview( WP_REST_Request $request ) {
		$token = $request->get_header( self::PREVIEW_HEADER );
		$settings = $this->get_settings();

		return ! empty( $settings['integration']['previewToken'] ) && hash_equals( $settings['integration']['previewToken'], (string) $token );
	}

	public function can_revalidate( WP_REST_Request $request ) {
		$token = $request->get_header( self::REVALIDATE_HEADER );
		$settings = $this->get_settings();

		return ! empty( $settings['integration']['revalidateSecret'] ) && hash_equals( $settings['integration']['revalidateSecret'], (string) $token );
	}

	public function configure_headless_runtime() {
		foreach ( array( 'post', 'page' ) as $post_type ) {
			if ( post_type_supports( $post_type, 'comments' ) ) {
				remove_post_type_support( $post_type, 'comments' );
			}
			if ( post_type_supports( $post_type, 'trackbacks' ) ) {
				remove_post_type_support( $post_type, 'trackbacks' );
			}
		}

		remove_action( 'wp_head', 'rsd_link' );
		remove_action( 'wp_head', 'wlwmanifest_link' );
		remove_action( 'wp_head', 'wp_shortlink_wp_head', 10 );
		remove_action( 'wp_head', 'rest_output_link_wp_head', 10 );
		remove_action( 'template_redirect', 'rest_output_link_header', 11 );
		remove_action( 'wp_head', 'wp_oembed_add_discovery_links', 10 );
		remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
		remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
		remove_action( 'wp_print_styles', 'print_emoji_styles' );
		remove_action( 'admin_print_styles', 'print_emoji_styles' );
	}

	public function cleanup_admin_menu() {
		remove_menu_page( 'edit-comments.php' );
	}

	public function use_block_editor_for_post_type( $use_block_editor, $post_type ) {
		if ( in_array( $post_type, array( 'menu_item', 'testimonial' ), true ) ) {
			return false;
		}

		return $use_block_editor;
	}

	public function filter_wp_robots( $robots ) {
		if ( ! is_admin() ) {
			$robots['noindex'] = true;
			$robots['nofollow'] = true;
		}

		return $robots;
	}

	public function register_admin_page() {
		add_menu_page(
			'Headless Settings',
			'Headless Settings',
			'manage_options',
			'frankies-headless',
			array( $this, 'render_admin_page' ),
			'dashicons-rest-api',
			59
		);
	}

	public function register_settings() {
		register_setting(
			'frankies_headless',
			self::OPTION_KEY,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( $this, 'sanitize_settings' ),
				'default'           => $this->default_settings(),
			)
		);
	}

	public function sanitize_settings( $input ) {
		$defaults = $this->default_settings();
		$clean = $defaults;

		foreach ( $this->field_map() as $path => $field ) {
			$value = $this->array_get( $input, $path );

			if ( 'boolean' === $field['type'] ) {
				$value = ! empty( $value );
			} elseif ( 'url' === $field['type'] ) {
				$value = esc_url_raw( (string) $value );
			} elseif ( 'json' === $field['type'] ) {
				$decoded = json_decode( wp_unslash( (string) $value ), true );
				$value = is_array( $decoded ) ? $decoded : $this->array_get( $defaults, $path );
			} else {
				$value = sanitize_textarea_field( (string) $value );
			}

			$this->array_set( $clean, $path, $value );
		}

		return $clean;
	}

	public function render_admin_page() {
		$settings = $this->get_settings();
		?>
		<div class="wrap">
			<h1>Frankies Headless Settings</h1>
			<p>Use this page for singleton homepage content, SEO metadata, preview secrets, and deployment hooks. Menu items and testimonials have their own content types.</p>
			<form method="post" action="options.php">
				<?php settings_fields( 'frankies_headless' ); ?>
				<table class="form-table" role="presentation">
					<tbody>
						<?php foreach ( $this->field_map() as $path => $field ) : ?>
							<tr>
								<th scope="row">
									<label for="<?php echo esc_attr( $this->field_id( $path ) ); ?>"><?php echo esc_html( $field['label'] ); ?></label>
								</th>
								<td>
									<?php $this->render_field_control( $path, $field, $settings ); ?>
									<?php if ( ! empty( $field['help'] ) ) : ?>
										<p class="description"><?php echo esc_html( $field['help'] ); ?></p>
									<?php endif; ?>
								</td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}

	private function render_field_control( $path, $field, $settings ) {
		$name = $this->field_name( $path );
		$id = $this->field_id( $path );
		$value = $this->array_get( $settings, $path );

		if ( 'boolean' === $field['type'] ) {
			?>
			<label>
				<input type="checkbox" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $name ); ?>" value="1" <?php checked( ! empty( $value ) ); ?> />
				Enabled
			</label>
			<?php
			return;
		}

		if ( 'json' === $field['type'] ) {
			?>
			<textarea class="large-text code" rows="8" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $name ); ?>"><?php echo esc_textarea( wp_json_encode( $value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) ); ?></textarea>
			<?php
			return;
		}

		if ( 'textarea' === $field['type'] ) {
			?>
			<textarea class="large-text" rows="4" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $name ); ?>"><?php echo esc_textarea( (string) $value ); ?></textarea>
			<?php
			return;
		}

		$type = 'url' === $field['type'] ? 'url' : 'text';
		?>
		<input class="regular-text" type="<?php echo esc_attr( $type ); ?>" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $name ); ?>" value="<?php echo esc_attr( (string) $value ); ?>" />
		<?php
	}

	public function register_meta_boxes() {
		add_meta_box(
			'frankies_menu_item_meta',
			'Menu Item Details',
			array( $this, 'render_menu_item_meta_box' ),
			'menu_item',
			'normal',
			'default'
		);

		add_meta_box(
			'frankies_testimonial_meta',
			'Testimonial Details',
			array( $this, 'render_testimonial_meta_box' ),
			'testimonial',
			'normal',
			'default'
		);

		foreach ( array( 'post', 'page' ) as $post_type ) {
			add_meta_box(
				'frankies_seo_meta',
				'Headless SEO',
				array( $this, 'render_seo_meta_box' ),
				$post_type,
				'side',
				'default'
			);
		}
	}

	public function render_menu_item_meta_box( WP_Post $post ) {
		wp_nonce_field( 'frankies_menu_item_meta', 'frankies_menu_item_meta_nonce' );
		?>
		<p><label>Description<br /><textarea class="widefat" rows="4" name="frankies_menu_description"><?php echo esc_textarea( (string) get_post_meta( $post->ID, '_frankies_description', true ) ); ?></textarea></label></p>
		<p><label>Price<br /><input class="widefat" type="text" name="frankies_menu_price" value="<?php echo esc_attr( (string) get_post_meta( $post->ID, '_frankies_price', true ) ); ?>" /></label></p>
		<p><label>Order URL override<br /><input class="widefat" type="url" name="frankies_menu_order_url" value="<?php echo esc_attr( (string) get_post_meta( $post->ID, '_frankies_order_url', true ) ); ?>" /></label></p>
		<p><label><input type="checkbox" name="frankies_menu_featured" value="1" <?php checked( (bool) get_post_meta( $post->ID, '_frankies_is_featured', true ) ); ?> /> Feature on the homepage</label></p>
		<p><label><input type="checkbox" name="frankies_menu_featured_dark" value="1" <?php checked( (bool) get_post_meta( $post->ID, '_frankies_featured_dark', true ) ); ?> /> Use dark featured card styling</label></p>
		<p class="description">Use the featured image for the card image. Use Menu Categories to control which section the item appears in.</p>
		<?php
	}

	public function render_testimonial_meta_box( WP_Post $post ) {
		wp_nonce_field( 'frankies_testimonial_meta', 'frankies_testimonial_meta_nonce' );
		?>
		<p><label>Body<br /><textarea class="widefat" rows="5" name="frankies_testimonial_body"><?php echo esc_textarea( (string) get_post_meta( $post->ID, '_frankies_body', true ) ); ?></textarea></label></p>
		<p><label>Source label<br /><input class="widefat" type="text" name="frankies_testimonial_source_label" value="<?php echo esc_attr( (string) get_post_meta( $post->ID, '_frankies_source_label', true ) ); ?>" /></label></p>
		<?php
	}

	public function render_seo_meta_box( WP_Post $post ) {
		wp_nonce_field( 'frankies_seo_meta', 'frankies_seo_meta_nonce' );
		?>
		<p><label>SEO title<br /><input class="widefat" type="text" name="frankies_seo_title" value="<?php echo esc_attr( (string) get_post_meta( $post->ID, '_frankies_seo_title', true ) ); ?>" /></label></p>
		<p><label>SEO description<br /><textarea class="widefat" rows="4" name="frankies_seo_description"><?php echo esc_textarea( (string) get_post_meta( $post->ID, '_frankies_seo_description', true ) ); ?></textarea></label></p>
		<p><label>Open Graph image URL<br /><input class="widefat" type="url" name="frankies_og_image" value="<?php echo esc_attr( (string) get_post_meta( $post->ID, '_frankies_og_image', true ) ); ?>" /></label></p>
		<p><label><input type="checkbox" name="frankies_noindex" value="1" <?php checked( (bool) get_post_meta( $post->ID, '_frankies_noindex', true ) ); ?> /> Noindex this entry</label></p>
		<p class="description">Used by the headless API for future article and page routes.</p>
		<?php
	}

	public function save_menu_item_meta( $post_id ) {
		if ( ! isset( $_POST['frankies_menu_item_meta_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['frankies_menu_item_meta_nonce'] ) ), 'frankies_menu_item_meta' ) ) {
			return;
		}

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		update_post_meta( $post_id, '_frankies_description', sanitize_textarea_field( wp_unslash( $_POST['frankies_menu_description'] ?? '' ) ) );
		update_post_meta( $post_id, '_frankies_price', sanitize_text_field( wp_unslash( $_POST['frankies_menu_price'] ?? '' ) ) );
		update_post_meta( $post_id, '_frankies_order_url', esc_url_raw( wp_unslash( $_POST['frankies_menu_order_url'] ?? '' ) ) );
		update_post_meta( $post_id, '_frankies_is_featured', ! empty( $_POST['frankies_menu_featured'] ) );
		update_post_meta( $post_id, '_frankies_featured_dark', ! empty( $_POST['frankies_menu_featured_dark'] ) );
	}

	public function save_testimonial_meta( $post_id ) {
		if ( ! isset( $_POST['frankies_testimonial_meta_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['frankies_testimonial_meta_nonce'] ) ), 'frankies_testimonial_meta' ) ) {
			return;
		}

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		update_post_meta( $post_id, '_frankies_body', sanitize_textarea_field( wp_unslash( $_POST['frankies_testimonial_body'] ?? '' ) ) );
		update_post_meta( $post_id, '_frankies_source_label', sanitize_text_field( wp_unslash( $_POST['frankies_testimonial_source_label'] ?? '' ) ) );
	}

	public function save_seo_meta_box( $post_id ) {
		if ( ! isset( $_POST['frankies_seo_meta_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['frankies_seo_meta_nonce'] ) ), 'frankies_seo_meta' ) ) {
			return;
		}

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		update_post_meta( $post_id, '_frankies_seo_title', sanitize_text_field( wp_unslash( $_POST['frankies_seo_title'] ?? '' ) ) );
		update_post_meta( $post_id, '_frankies_seo_description', sanitize_textarea_field( wp_unslash( $_POST['frankies_seo_description'] ?? '' ) ) );
		update_post_meta( $post_id, '_frankies_og_image', esc_url_raw( wp_unslash( $_POST['frankies_og_image'] ?? '' ) ) );
		update_post_meta( $post_id, '_frankies_noindex', ! empty( $_POST['frankies_noindex'] ) );
	}

	public function render_menu_category_add_fields() {
		?>
		<div class="form-field">
			<label for="frankies-menu-category-display-order">Display order</label>
			<input type="number" name="frankies_menu_category_display_order" id="frankies-menu-category-display-order" value="0" />
		</div>
		<div class="form-field">
			<label for="frankies-menu-category-cta-label">CTA label</label>
			<input type="text" name="frankies_menu_category_cta_label" id="frankies-menu-category-cta-label" value="" />
		</div>
		<div class="form-field">
			<label for="frankies-menu-category-image">Section image URL</label>
			<input type="url" name="frankies_menu_category_image" id="frankies-menu-category-image" value="" />
			<p>Optional image shown with this menu section in the frontend.</p>
		</div>
		<?php
	}

	public function render_menu_category_edit_fields( WP_Term $term ) {
		?>
		<tr class="form-field">
			<th scope="row"><label for="frankies-menu-category-display-order">Display order</label></th>
			<td><input type="number" name="frankies_menu_category_display_order" id="frankies-menu-category-display-order" value="<?php echo esc_attr( (string) get_term_meta( $term->term_id, '_frankies_display_order', true ) ); ?>" /></td>
		</tr>
		<tr class="form-field">
			<th scope="row"><label for="frankies-menu-category-cta-label">CTA label</label></th>
			<td><input type="text" name="frankies_menu_category_cta_label" id="frankies-menu-category-cta-label" value="<?php echo esc_attr( (string) get_term_meta( $term->term_id, '_frankies_cta_label', true ) ); ?>" /></td>
		</tr>
		<tr class="form-field">
			<th scope="row"><label for="frankies-menu-category-image">Section image URL</label></th>
			<td>
				<input type="url" name="frankies_menu_category_image" id="frankies-menu-category-image" value="<?php echo esc_attr( (string) get_term_meta( $term->term_id, '_frankies_image', true ) ); ?>" class="regular-text" />
				<p class="description">Optional image shown with this menu section in the frontend.</p>
			</td>
		</tr>
		<?php
	}

	public function save_menu_category_meta( $term_id ) {
		update_term_meta( $term_id, '_frankies_display_order', (int) ( $_POST['frankies_menu_category_display_order'] ?? 0 ) );
		update_term_meta( $term_id, '_frankies_cta_label', sanitize_text_field( wp_unslash( $_POST['frankies_menu_category_cta_label'] ?? '' ) ) );
		update_term_meta( $term_id, '_frankies_image', esc_url_raw( wp_unslash( $_POST['frankies_menu_category_image'] ?? '' ) ) );
	}

	public function trigger_frontend_revalidation() {
		$settings = $this->get_settings();
		if ( empty( $settings['integration']['frontendRevalidateUrl'] ) || empty( $settings['integration']['revalidateSecret'] ) ) {
			return;
		}

		$this->dispatch_frontend_revalidation();
	}

	private function dispatch_frontend_revalidation() {
		$settings = $this->get_settings();

		if ( empty( $settings['integration']['frontendRevalidateUrl'] ) || empty( $settings['integration']['revalidateSecret'] ) ) {
			return new WP_Error( 'frankies_revalidate_not_configured', 'Frontend revalidation URL or secret is not configured.', array( 'status' => 400 ) );
		}

		return wp_remote_post(
			$settings['integration']['frontendRevalidateUrl'],
			array(
				'timeout' => 10,
				'headers' => array(
					self::REVALIDATE_HEADER => $settings['integration']['revalidateSecret'],
					'Content-Type'          => 'application/json',
				),
				'body'    => wp_json_encode(
					array(
						'source' => 'wordpress',
						'site'   => home_url(),
					)
				),
			)
		);
	}

	public function filter_rest_endpoints( $endpoints ) {
		if ( ! is_user_logged_in() ) {
			unset( $endpoints['/wp/v2/users'] );
			unset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] );
		}

		return $endpoints;
	}

	private function build_bootstrap_payload( $preview ) {
		$settings = $this->get_settings();
		$testimonials = $this->get_testimonials( $preview );
		$site_url = trailingslashit( untrailingslashit( $settings['seo']['siteUrl'] ?: home_url() ) );
		$navigation = $this->get_navigation_items( 'primary_navigation' );
		$hero = $settings['hero'];
		$hero['backgroundImage'] = $this->normalize_public_url( $hero['backgroundImage'], $site_url );
		$hero['mobileImage'] = $this->normalize_public_url( $hero['mobileImage'], $site_url );
		$about = $settings['about'];
		$about['image'] = $this->normalize_public_url( $about['image'], $site_url );
		$proof = $settings['proof'];
		$proof['backgroundImage'] = $this->normalize_public_url( $proof['backgroundImage'], $site_url );
		$menu = $settings['menu'];
		$menu['image'] = $this->normalize_public_url( $menu['image'], $site_url );
		$location = $settings['location'];
		$order_url = isset( $location['orderUrl'] ) ? (string) $location['orderUrl'] : '';
		$hero['primaryCta'] = $this->resolve_order_cta_url( $hero['primaryCta'], $order_url );
		$settings['menu']['footerCta'] = $this->resolve_order_cta_url( $settings['menu']['footerCta'], $order_url );
		$location['primaryCta'] = $this->resolve_order_cta_url( $location['primaryCta'], $order_url );
		$location['cateringCta'] = $this->resolve_order_cta_url( $location['cateringCta'], $order_url );
		$settings['finalCta']['primaryCta'] = $this->resolve_order_cta_url( $settings['finalCta']['primaryCta'], $order_url );
		$location['mapEmbedUrl'] = $this->resolve_map_embed_url( $location );
		$seo_og_image = $this->normalize_public_url( $settings['seo']['ogImage'], $site_url );

		return array(
			'content' => array(
				'announcement'  => $settings['site']['announcement'],
				'siteName'      => $settings['site']['siteName'],
				'siteTagline'   => $settings['site']['siteTagline'],
				'siteLogo'      => $this->normalize_public_url( $settings['site']['logoUrl'], $site_url ),
				'siteLogoAlt'   => (string) $settings['site']['logoAlt'],
				'hero'          => $hero,
				'navigation'    => ! empty( $navigation ) ? $navigation : $settings['navigation'],
				'featuredIntro' => $settings['featuredIntro'],
				'featuredItems' => array(),
				'reasons'       => $settings['reasons'],
				'menu'          => array(
					'eyebrow'    => $settings['menu']['eyebrow'],
					'title'      => $settings['menu']['title'],
					'body'       => $settings['menu']['body'],
					'note'       => $settings['menu']['note'],
					'categoryFocusTitle' => $settings['menu']['categoryFocusTitle'],
					'categoryFocusBody'  => $settings['menu']['categoryFocusBody'],
					'itemCtaLabel'       => $settings['menu']['itemCtaLabel'],
					'image'      => $this->resolve_menu_image_url( $settings['menu'], $site_url ),
					'imageAlt'   => (string) ( $settings['menu']['imageAlt'] ?: $settings['site']['siteName'] . ' menu' ),
					'ctas'       => array(),
					'sections'   => array(),
					'footerNote' => $settings['menu']['footerNote'],
					'footerCta'  => $settings['menu']['footerCta'],
				),
				'about'         => $about,
				'proof'         => array(
					'eyebrow' => $proof['eyebrow'],
					'title'   => $proof['title'],
					'body'    => $proof['body'],
					'backgroundImage' => $proof['backgroundImage'],
					'items'   => $testimonials,
				),
				'location'      => $location,
				'finalCta'      => $settings['finalCta'],
				'footer'        => $settings['footer'],
			),
			'seo'     => array(
				'title'            => $settings['seo']['title'],
				'description'      => $settings['seo']['description'],
				'canonicalUrl'     => $site_url,
				'ogImage'          => $seo_og_image,
				'keywords'         => $settings['seo']['keywords'],
				'noindex'          => ! empty( $settings['seo']['noindex'] ),
				'twitterCard'      => 'summary_large_image',
				'schema'           => $this->build_homepage_schema( $settings, $site_url ),
			),
			'integration' => array(
				'gaMeasurementId' => $settings['integration']['gaMeasurementId'],
			),
			'generatedAt' => current_time( 'mysql', true ),
			'preview'     => $preview,
		);
	}

	private function build_settings_payload() {
		$settings = $this->get_settings();
		$site_url = $this->get_public_site_url();
		$site = $settings['site'];
		$site['logoUrl'] = $this->normalize_public_url( $site['logoUrl'], $site_url );
		$hero = $settings['hero'];
		$hero['backgroundImage'] = $this->normalize_public_url( $hero['backgroundImage'], $site_url );
		$hero['mobileImage'] = $this->normalize_public_url( $hero['mobileImage'], $site_url );
		$about = $settings['about'];
		$about['image'] = $this->normalize_public_url( $about['image'], $site_url );
		$proof = $settings['proof'];
		$proof['backgroundImage'] = $this->normalize_public_url( $proof['backgroundImage'], $site_url );
		$menu = $settings['menu'];
		$menu['image'] = $this->resolve_menu_image_url( $menu, $site_url );
		$menu['imageAlt'] = (string) ( $menu['imageAlt'] ?: $settings['site']['siteName'] . ' menu' );
		$location = $settings['location'];
		$order_url = isset( $location['orderUrl'] ) ? (string) $location['orderUrl'] : '';
		$hero['primaryCta'] = $this->resolve_order_cta_url( $hero['primaryCta'], $order_url );
		$settings['menu']['footerCta'] = $this->resolve_order_cta_url( $settings['menu']['footerCta'], $order_url );
		$location['primaryCta'] = $this->resolve_order_cta_url( $location['primaryCta'], $order_url );
		$location['cateringCta'] = $this->resolve_order_cta_url( $location['cateringCta'], $order_url );
		$settings['finalCta']['primaryCta'] = $this->resolve_order_cta_url( $settings['finalCta']['primaryCta'], $order_url );
		$location['mapEmbedUrl'] = $this->resolve_map_embed_url( $location );
		$seo_defaults = $settings['seo'];
		$seo_defaults['ogImage'] = $this->normalize_public_url( $seo_defaults['ogImage'], $site_url );

		return array(
			'site'        => $site,
			'hero'        => $hero,
			'featured'    => $settings['featuredIntro'],
			'reasons'     => $settings['reasons'],
			'menu'        => $menu,
			'about'       => $about,
			'proof'       => $proof,
			'location'    => $location,
			'finalCta'    => $settings['finalCta'],
			'footer'      => $settings['footer'],
			'seoDefaults' => $seo_defaults,
			'integration' => array(
				'gaMeasurementId' => $settings['integration']['gaMeasurementId'],
			),
		);
	}

	private function get_featured_items( $preview ) {
		$items = get_posts(
			array(
				'post_type'      => 'menu_item',
				'post_status'    => $preview ? array( 'publish', 'draft', 'future', 'pending', 'private' ) : 'publish',
				'posts_per_page' => 6,
				'meta_key'       => '_frankies_is_featured',
				'meta_value'     => true,
				'orderby'        => array(
					'menu_order' => 'ASC',
					'title'      => 'ASC',
				),
			)
		);

		return array_map( array( $this, 'map_menu_item_to_featured' ), $items );
	}

	private function get_menu_sections( $preview ) {
		$terms = get_terms(
			array(
				'taxonomy'   => 'menu_category',
				'hide_empty' => false,
			)
		);

		if ( is_wp_error( $terms ) ) {
			return array();
		}

		usort(
			$terms,
			function( $a, $b ) {
				return (int) get_term_meta( $a->term_id, '_frankies_display_order', true ) <=> (int) get_term_meta( $b->term_id, '_frankies_display_order', true );
			}
		);

		$sections = array();
		foreach ( $terms as $term ) {
			$posts = get_posts(
				array(
					'post_type'      => 'menu_item',
					'post_status'    => $preview ? array( 'publish', 'draft', 'future', 'pending', 'private' ) : 'publish',
					'posts_per_page' => -1,
					'orderby'        => array(
						'menu_order' => 'ASC',
						'title'      => 'ASC',
					),
					'tax_query'      => array(
						array(
							'taxonomy' => 'menu_category',
							'field'    => 'term_id',
							'terms'    => $term->term_id,
						),
					),
				)
			);

			$sections[] = array(
				'title'    => $term->name,
				'image'    => $this->normalize_public_url( (string) get_term_meta( $term->term_id, '_frankies_image', true ), $this->get_public_site_url() ),
				'ctaLabel' => get_term_meta( $term->term_id, '_frankies_cta_label', true ) ?: $term->name,
				'items'    => array_map(
					function( $post ) {
						$price = (string) get_post_meta( $post->ID, '_frankies_price', true );
						return trim( $post->post_title . ( $price ? ' - ' . $price : '' ) );
					},
					$posts
				),
			);
		}

		return $sections;
	}

	private function get_testimonials( $preview ) {
		$posts = get_posts(
			array(
				'post_type'      => 'testimonial',
				'post_status'    => $preview ? array( 'publish', 'draft', 'future', 'pending', 'private' ) : 'publish',
				'posts_per_page' => 6,
				'orderby'        => array(
					'menu_order' => 'ASC',
					'date'       => 'DESC',
				),
			)
		);

		return array_map(
			function( $post ) {
				return array(
					'title'  => $post->post_title,
					'body'   => (string) get_post_meta( $post->ID, '_frankies_body', true ),
					'source' => (string) get_post_meta( $post->ID, '_frankies_source_label', true ),
				);
			},
			$posts
		);
	}

	private function map_menu_item_to_featured( WP_Post $post ) {
		$media = $this->get_featured_media_payload( $post->ID, 'large' );

		return array(
			'name'        => $post->post_title,
			'description' => (string) get_post_meta( $post->ID, '_frankies_description', true ),
			'price'       => (string) get_post_meta( $post->ID, '_frankies_price', true ),
			'image'       => $media['url'],
			'imageAlt'    => $media['alt'],
			'dark'        => (bool) get_post_meta( $post->ID, '_frankies_featured_dark', true ),
			'orderUrl'    => (string) get_post_meta( $post->ID, '_frankies_order_url', true ),
		);
	}

	private function get_navigation_items( $location ) {
		$locations = get_nav_menu_locations();
		if ( empty( $locations[ $location ] ) ) {
			return array();
		}

		$items = wp_get_nav_menu_items( $locations[ $location ] );
		if ( empty( $items ) ) {
			return array();
		}

		usort(
			$items,
			function( $a, $b ) {
				return (int) $a->menu_order <=> (int) $b->menu_order;
			}
		);

		return array_values(
			array_map(
				function( $item ) {
					return array(
						'label' => $item->title,
						'href'  => $item->url,
					);
				},
				$items
			)
		);
	}

	private function request_allows_preview( WP_REST_Request $request ) {
		$preview_flag = (string) $request->get_param( 'preview' );
		if ( '1' !== $preview_flag && 'true' !== strtolower( $preview_flag ) ) {
			return false;
		}

		return $this->can_access_preview( $request );
	}

	private function get_public_post_statuses( $preview ) {
		return $preview ? array( 'publish', 'draft', 'future', 'pending', 'private' ) : 'publish';
	}

	private function get_post_by_slug( $post_type, $slug, $preview ) {
		$posts = get_posts(
			array(
				'name'           => sanitize_title( $slug ),
				'post_type'      => $post_type,
				'post_status'    => $this->get_public_post_statuses( $preview ),
				'posts_per_page' => 1,
			)
		);

		return ! empty( $posts ) ? $posts[0] : null;
	}

	private function map_post_to_archive_item( WP_Post $post ) {
		$media = $this->get_featured_media_payload( $post->ID, 'large' );

		return array(
			'title'         => get_the_title( $post ),
			'slug'          => $post->post_name,
			'excerpt'       => has_excerpt( $post ) ? get_the_excerpt( $post ) : wp_trim_words( wp_strip_all_tags( (string) $post->post_content ), 32 ),
			'featuredImage' => $media['url'],
			'featuredImageAlt' => $media['alt'],
			'publishedAt'   => get_post_time( DATE_ATOM, true, $post ),
			'modifiedAt'    => get_post_modified_time( DATE_ATOM, true, $post ),
			'categories'    => $this->map_term_collection( get_the_terms( $post, 'category' ) ),
			'tags'          => $this->map_term_collection( get_the_terms( $post, 'post_tag' ) ),
			'seo'           => $this->build_entry_seo_payload( $post ),
		);
	}

	private function map_post_to_single_item( WP_Post $post ) {
		$related_posts = $this->get_related_posts( $post );
		$media = $this->get_featured_media_payload( $post->ID, 'large' );

		return array(
			'type'          => 'post',
			'title'         => get_the_title( $post ),
			'slug'          => $post->post_name,
			'excerpt'       => has_excerpt( $post ) ? get_the_excerpt( $post ) : '',
			'content'       => apply_filters( 'the_content', $post->post_content ),
			'featuredImage' => $media['url'],
			'featuredImageAlt' => $media['alt'],
			'publishedAt'   => get_post_time( DATE_ATOM, true, $post ),
			'modifiedAt'    => get_post_modified_time( DATE_ATOM, true, $post ),
			'categories'    => $this->map_term_collection( get_the_terms( $post, 'category' ) ),
			'tags'          => $this->map_term_collection( get_the_terms( $post, 'post_tag' ) ),
			'seo'           => $this->build_entry_seo_payload( $post ),
			'related'       => array_map( array( $this, 'map_post_to_archive_item' ), $related_posts ),
		);
	}

	private function map_page_to_item( WP_Post $page ) {
		$media = $this->get_featured_media_payload( $page->ID, 'large' );

		return array(
			'type'          => 'page',
			'title'         => get_the_title( $page ),
			'slug'          => $page->post_name,
			'content'       => apply_filters( 'the_content', $page->post_content ),
			'featuredImage' => $media['url'],
			'featuredImageAlt' => $media['alt'],
			'modifiedAt'    => get_post_modified_time( DATE_ATOM, true, $page ),
			'seo'           => $this->build_entry_seo_payload( $page ),
		);
	}

	private function map_page_to_archive_item( WP_Post $page ) {
		$media = $this->get_featured_media_payload( $page->ID, 'large' );

		return array(
			'title'         => get_the_title( $page ),
			'slug'          => $page->post_name,
			'featuredImage' => $media['url'],
			'featuredImageAlt' => $media['alt'],
			'modifiedAt'    => get_post_modified_time( DATE_ATOM, true, $page ),
			'seo'           => $this->build_entry_seo_payload( $page ),
		);
	}

	private function get_related_posts( WP_Post $post ) {
		$category_ids = wp_list_pluck( get_the_terms( $post, 'category' ) ?: array(), 'term_id' );
		if ( empty( $category_ids ) ) {
			return array();
		}

		return get_posts(
			array(
				'post_type'      => 'post',
				'post_status'    => 'publish',
				'post__not_in'   => array( $post->ID ),
				'posts_per_page' => 3,
				'tax_query'      => array(
					array(
						'taxonomy' => 'category',
						'field'    => 'term_id',
						'terms'    => $category_ids,
					),
				),
			)
		);
	}

	private function build_entry_seo_payload( WP_Post $post ) {
		$settings = $this->get_settings();
		$title = (string) get_post_meta( $post->ID, '_frankies_seo_title', true );
		$description = (string) get_post_meta( $post->ID, '_frankies_seo_description', true );
		$og_image = (string) get_post_meta( $post->ID, '_frankies_og_image', true );
		$canonical_url = $this->get_public_permalink( $post );
		$site_url = $this->get_public_site_url();
		$site_name = $settings['site']['siteName'];
		$resolved_title = $title ?: sprintf( '%s | %s', get_the_title( $post ), $site_name );
		$resolved_description = $description ?: ( has_excerpt( $post ) ? get_the_excerpt( $post ) : $settings['seo']['description'] );
		$resolved_image = $og_image ?: ( get_the_post_thumbnail_url( $post->ID, 'large' ) ?: $settings['seo']['ogImage'] );
		$resolved_keywords = $this->build_post_keywords( $post, $settings['seo']['keywords'] );
		$noindex = (bool) get_post_meta( $post->ID, '_frankies_noindex', true );

		return array(
			'title'        => $resolved_title,
			'description'  => $resolved_description,
			'canonicalUrl' => $canonical_url,
			'ogImage'      => $resolved_image,
			'keywords'     => $resolved_keywords,
			'noindex'      => $noindex,
			'twitterCard'  => 'summary_large_image',
			'schema'       => 'post' === $post->post_type
				? $this->build_post_schema( $post, $site_url, $canonical_url, $resolved_title, $resolved_description, $resolved_image )
				: $this->build_page_schema( $post, $site_url, $canonical_url, $resolved_title, $resolved_description, $resolved_image ),
		);
	}

	private function get_featured_media_payload( $post_id, $size = 'large' ) {
		$thumbnail_id = get_post_thumbnail_id( $post_id );
		$url = $thumbnail_id ? wp_get_attachment_image_url( $thumbnail_id, $size ) : '';
		$alt = $thumbnail_id ? trim( (string) get_post_meta( $thumbnail_id, '_wp_attachment_image_alt', true ) ) : '';

		if ( empty( $alt ) ) {
			$alt = get_the_title( $post_id );
		}

		return array(
			'url' => $this->normalize_public_url( $url ?: '', $this->get_public_site_url() ),
			'alt' => $alt ?: '',
		);
	}

	private function get_public_site_url() {
		$settings = $this->get_settings();
		return trailingslashit( untrailingslashit( $settings['seo']['siteUrl'] ?: home_url() ) );
	}

	private function resolve_menu_image_url( $menu, $site_url ) {
		$menu_image = $this->normalize_public_url( $menu['image'], $site_url );

		if ( ! empty( $menu_image ) ) {
			return $menu_image;
		}

		return $this->normalize_public_url( $this->get_legacy_menu_category_image(), $site_url );
	}

	private function get_legacy_menu_category_image() {
		if ( ! taxonomy_exists( 'menu_category' ) ) {
			return '';
		}

		$terms = get_terms(
			array(
				'taxonomy'   => 'menu_category',
				'hide_empty' => false,
				'meta_key'   => '_frankies_display_order',
				'orderby'    => 'meta_value_num',
				'order'      => 'ASC',
			)
		);

		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			return '';
		}

		foreach ( $terms as $term ) {
			$image = (string) get_term_meta( $term->term_id, '_frankies_image', true );
			if ( ! empty( $image ) ) {
				return $image;
			}
		}

		return '';
	}

	private function resolve_order_cta_url( $cta, $order_url ) {
		if ( ! is_array( $cta ) ) {
			return $cta;
		}

		$href = isset( $cta['href'] ) ? trim( (string) $cta['href'] ) : '';
		$label = isset( $cta['label'] ) ? (string) $cta['label'] : '';

		if ( empty( $order_url ) || ! preg_match( '/order/i', $label ) ) {
			return $cta;
		}

		if ( '' === $href || '#location' === $href || '/#location' === $href ) {
			$cta['href'] = esc_url_raw( $order_url );
		}

		return $cta;
	}

	private function normalize_public_url( $url, $public_site_url = '' ) {
		$url = trim( (string) $url );
		if ( '' === $url ) {
			return '';
		}

		$public_site_url = $public_site_url ?: $this->get_public_site_url();
		$public_parts = wp_parse_url( $public_site_url );
		$url_parts = wp_parse_url( $url );

		if ( empty( $public_parts['scheme'] ) || empty( $public_parts['host'] ) || empty( $url_parts['scheme'] ) || empty( $url_parts['host'] ) ) {
			return $url;
		}

		$current_home_parts = wp_parse_url( home_url() );
		$current_site_parts = wp_parse_url( site_url() );
		$source_hosts = array();

		foreach ( array( $current_home_parts, $current_site_parts ) as $parts ) {
			if ( empty( $parts['host'] ) ) {
				continue;
			}

			$source_hosts[] = strtolower( $parts['host'] ) . ':' . ( isset( $parts['port'] ) ? (string) $parts['port'] : '' );
		}

		$url_host_key = strtolower( $url_parts['host'] ) . ':' . ( isset( $url_parts['port'] ) ? (string) $url_parts['port'] : '' );
		$path = isset( $url_parts['path'] ) ? (string) $url_parts['path'] : '';
		$is_upload_asset = 0 === strpos( $path, '/wp-content/uploads/' );

		if ( ! $is_upload_asset && ! in_array( $url_host_key, array_unique( $source_hosts ), true ) ) {
			return $url;
		}

		$rebuilt = $public_parts['scheme'] . '://' . $public_parts['host'];
		if ( isset( $public_parts['port'] ) ) {
			$rebuilt .= ':' . $public_parts['port'];
		}

		$rebuilt .= isset( $url_parts['path'] ) ? $url_parts['path'] : '';

		if ( isset( $url_parts['query'] ) ) {
			$rebuilt .= '?' . $url_parts['query'];
		}

		if ( isset( $url_parts['fragment'] ) ) {
			$rebuilt .= '#' . $url_parts['fragment'];
		}

		return $rebuilt;
	}

	private function resolve_map_embed_url( $location ) {
		$url = trim( (string) ( $location['mapEmbedUrl'] ?? '' ) );
		if ( '' === $url ) {
			return '';
		}

		if ( false !== strpos( $url, 'output=embed' ) || false !== strpos( $url, '/maps/embed' ) ) {
			return esc_url_raw( $url );
		}

		$host = (string) wp_parse_url( $url, PHP_URL_HOST );
		if ( false !== strpos( $host, 'google.' ) ) {
			$parts = array_filter(
				array(
					$location['name'] ?? '',
					$location['address'] ?? '',
					$location['city'] ?? '',
					$location['region'] ?? '',
					$location['postalCode'] ?? '',
					$location['country'] ?? '',
				)
			);

			if ( ! empty( $parts ) ) {
				return 'https://www.google.com/maps?q=' . rawurlencode( implode( ', ', $parts ) ) . '&output=embed';
			}
		}

		return esc_url_raw( $url );
	}

	private function get_public_permalink( WP_Post $post ) {
		$site_url = $this->get_public_site_url();

		if ( 'post' === $post->post_type ) {
			return trailingslashit( $site_url . 'blog/' . $post->post_name );
		}

		return trailingslashit( $site_url . $post->post_name );
	}

	private function build_post_keywords( WP_Post $post, $fallback_keywords ) {
		$parts = array();
		$terms = array_merge(
			$this->map_term_collection( get_the_terms( $post, 'category' ) ),
			$this->map_term_collection( get_the_terms( $post, 'post_tag' ) )
		);

		foreach ( $terms as $term ) {
			$parts[] = $term['name'];
		}

		$parts[] = get_the_title( $post );
		$parts[] = $fallback_keywords;

		return implode( ', ', array_unique( array_filter( array_map( 'trim', $parts ) ) ) );
	}

	private function build_homepage_schema( $settings, $site_url ) {
		$organization_id = $site_url . '#organization';
		$website_id = $site_url . '#website';
		$restaurant_id = $site_url . '#localbusiness';
		$logo = $this->normalize_public_url( $settings['site']['logoUrl'], $site_url );
		if ( empty( $logo ) ) {
			$logo = $this->normalize_public_url( $settings['seo']['ogImage'], $site_url );
		}
		$images = array_values(
			array_filter(
				array(
					$this->normalize_public_url( $settings['hero']['backgroundImage'], $site_url ),
					$logo,
				)
			)
		);

		return array(
			'@context' => 'https://schema.org',
			'@graph'   => array(
				array(
					'@type' => 'Organization',
					'@id'   => $organization_id,
					'name'  => $settings['site']['siteName'],
					'url'   => $site_url,
					'logo'  => $logo,
					'sameAs' => $settings['seo']['sameAs'],
				),
				array(
					'@type'       => 'WebSite',
					'@id'         => $website_id,
					'url'         => $site_url,
					'name'        => $settings['site']['siteName'],
					'description' => $settings['site']['siteTagline'],
					'publisher'   => array(
						'@id' => $organization_id,
					),
				),
				array(
					'@type'               => 'Restaurant',
					'@id'                 => $restaurant_id,
					'name'                => $settings['site']['siteName'],
					'url'                 => $site_url,
					'image'               => $images,
					'telephone'           => $settings['location']['phone'],
					'servesCuisine'       => array( 'Breakfast', 'Burritos', 'Mexican-American' ),
					'address'             => array(
						'@type'           => 'PostalAddress',
						'streetAddress'   => $settings['location']['address'],
						'addressLocality' => $settings['location']['city'],
						'addressRegion'   => $settings['location']['region'],
						'postalCode'      => $settings['location']['postalCode'],
						'addressCountry'  => $settings['location']['country'],
					),
					'openingHours'        => $settings['location']['openingHoursSchema'],
					'acceptsReservations' => false,
					'menu'                => $site_url . '#menu',
					'sameAs'              => $settings['seo']['sameAs'],
				),
			),
		);
	}

	private function build_page_schema( WP_Post $post, $site_url, $canonical_url, $title, $description, $image_url ) {
		return array(
			'@context' => 'https://schema.org',
			'@graph'   => array(
				array(
					'@type' => 'BreadcrumbList',
					'itemListElement' => array(
						$this->build_breadcrumb_item( 1, $site_url, 'Home' ),
						$this->build_breadcrumb_item( 2, $canonical_url, get_the_title( $post ) ),
					),
				),
				array(
					'@type'       => 'WebPage',
					'@id'         => $canonical_url . '#webpage',
					'url'         => $canonical_url,
					'name'        => $title,
					'description' => $description,
					'image'       => $image_url,
					'dateModified' => get_post_modified_time( DATE_ATOM, true, $post ),
				),
			),
		);
	}

	private function build_post_schema( WP_Post $post, $site_url, $canonical_url, $title, $description, $image_url ) {
		$author_name = get_the_author_meta( 'display_name', (int) $post->post_author ) ?: $this->get_settings()['site']['siteName'];

		return array(
			'@context' => 'https://schema.org',
			'@graph'   => array(
				array(
					'@type' => 'BreadcrumbList',
					'itemListElement' => array(
						$this->build_breadcrumb_item( 1, $site_url, 'Home' ),
						$this->build_breadcrumb_item( 2, trailingslashit( $site_url . 'blog' ), 'Journal' ),
						$this->build_breadcrumb_item( 3, $canonical_url, get_the_title( $post ) ),
					),
				),
				array(
					'@type'            => 'BlogPosting',
					'@id'              => $canonical_url . '#article',
					'mainEntityOfPage' => $canonical_url,
					'headline'         => $title,
					'description'      => $description,
					'image'            => $image_url,
					'datePublished'    => get_post_time( DATE_ATOM, true, $post ),
					'dateModified'     => get_post_modified_time( DATE_ATOM, true, $post ),
					'author'           => array(
						'@type' => 'Person',
						'name'  => $author_name,
					),
				),
			),
		);
	}

	private function build_breadcrumb_item( $position, $url, $name ) {
		return array(
			'@type'    => 'ListItem',
			'position' => (int) $position,
			'name'     => $name,
			'item'     => $url,
		);
	}

	private function map_term_collection( $terms ) {
		if ( empty( $terms ) || is_wp_error( $terms ) ) {
			return array();
		}

		return array_values(
			array_map(
				function( $term ) {
					return array(
						'id'   => (int) $term->term_id,
						'name' => $term->name,
						'slug' => $term->slug,
					);
				},
				$terms
			)
		);
	}

	private function get_term_archive_items( $taxonomy ) {
		$terms = get_terms(
			array(
				'taxonomy'   => $taxonomy,
				'hide_empty' => true,
			)
		);

		return $this->map_term_collection( is_wp_error( $terms ) ? array() : $terms );
	}

	public function sanitize_checkbox_meta( $value ) {
		return ! empty( $value );
	}

	private function default_settings() {
		return array(
			'site'          => array(
				'announcement' => 'Fresh breakfast burritos made daily in Agoura Hills. Order online for pickup.',
				'siteName'     => "Frankie's Breakfast Burritos",
				'siteTagline'  => 'Fire-grilled breakfast burritos with big morning energy',
				'logoUrl'      => '',
				'logoAlt'      => "Frankie's Breakfast Burritos",
			),
			'navigation'    => array(
				array( 'label' => 'Home', 'href' => '#top' ),
				array( 'label' => 'Menu', 'href' => '#menu' ),
				array( 'label' => 'Featured', 'href' => '#featured' ),
				array( 'label' => 'About', 'href' => '#about' ),
				array( 'label' => 'Location', 'href' => '#location' ),
			),
			'hero'          => array(
				'title'           => "FRANKIE'S\nBREAKFAST BURRITOS",
				'backgroundImage' => '',
				'mobileImage'     => '',
				'primaryCta'      => array( 'label' => 'Order Online', 'href' => '#location', 'variant' => 'primary' ),
				'secondaryCta'    => array( 'label' => 'View Menu', 'href' => '#menu', 'variant' => 'secondary' ),
			),
			'featuredIntro' => array(
				'eyebrow' => 'FEATURED BURRITOS',
				'title'   => 'The burritos people will open the site for.',
				'cta'     => array( 'label' => 'See Full Menu', 'href' => '#menu', 'variant' => 'primary' ),
			),
			'reasons'       => array(
				'eyebrow' => "WHY PEOPLE LOVE FRANKIE'S",
				'title'   => 'Built like a neighborhood favorite, presented like a premium fast-casual brand.',
				'body'    => 'Every highlight below reinforces appetite, trust, and speed so the site feels handcrafted without slowing down the order path.',
				'items'   => array(
					array(
						'number' => '01',
						'title'  => 'Fresh ingredients, layered with intention',
						'body'   => 'Cage-free eggs, premium proteins, bright salsas, and queso-driven richness create a strong first impression.',
					),
					array(
						'number' => '02',
						'title'  => 'Fast pickup without boring food',
						'body'   => 'The site prioritizes order buttons, visible prices, and clear menu browsing so the path to checkout stays short.',
					),
				),
			),
			'menu'          => array(
				'eyebrow'    => 'FULL MENU',
				'title'      => 'The full spread, presented like a house menu board.',
				'body'       => 'Show a single menu image managed directly in WordPress.',
				'note'       => 'Upload or paste your latest menu image URL here.',
				'image'      => '',
				'imageAlt'   => "Frankie's Breakfast Burritos menu",
				'categoryFocusTitle' => 'Category focus',
				'categoryFocusBody'  => 'Browse one category at a time for a cleaner, more premium menu interaction without clutter.',
				'itemCtaLabel'       => 'Order this burrito',
				'footerNote' => 'Open live ordering for modifiers and full details.',
				'footerCta'  => array( 'label' => 'Order with Toast', 'href' => '#location', 'variant' => 'primary' ),
			),
			'about'         => array(
				'eyebrow'    => "ABOUT FRANKIE'S",
				'title'      => 'A neighborhood breakfast burrito spot with enough craft to feel worth the detour.',
				'paragraphs' => array(
					'Use this section to tell the brand story in two short paragraphs.',
					'Keep the copy specific, local, and operationally credible.',
				),
				'image'       => '',
				'facts'       => array(
					array( 'value' => 'Open daily', 'label' => '8 AM to 3 PM' ),
					array( 'value' => 'Agoura Hills', 'label' => 'Roadside Drive pickup' ),
				),
			),
			'proof'         => array(
				'eyebrow'         => 'SOCIAL PROOF',
				'title'           => 'Trust cues that reassure people before they commit to breakfast.',
				'body'            => 'Testimonials are managed as their own content type so they can be reviewed independently.',
				'backgroundImage' => '',
			),
			'location'      => array(
				'eyebrow'            => 'LOCATION, HOURS, AND ORDERING',
				'title'              => 'Easy to find. Easy to order. Easy to come back to.',
				'name'               => "Frankie's Breakfast Burritos",
				'address'            => '28708 Roadside Drive',
				'city'               => 'Agoura Hills',
				'region'             => 'CA',
				'postalCode'         => '91301',
				'country'            => 'US',
				'phone'              => '+18183181034',
				'hours'              => 'Open daily from 8:00 AM to 3:00 PM',
				'openingHoursSchema' => array( 'Mo-Su 08:00-15:00' ),
				'ordering'           => 'Pickup, delivery, catering, and gift cards all route through Toast.',
				'orderUrl'           => 'https://frankiesbreakfastburritos.toast.site/',
				'primaryCta'         => array( 'label' => 'Order Online', 'href' => '', 'variant' => 'primary' ),
				'secondaryCta'       => array( 'label' => 'Call Store', 'href' => 'tel:+18183181034', 'variant' => 'secondary' ),
				'mapTitle'           => 'Map and storefront panel',
				'mapBody'            => 'Responsive embed area with parking, pickup, and landmark context.',
				'mapEmbedUrl'        => '',
				'cateringText'       => 'Need breakfast for a crew? Catering packs feed up to 10 with 48 hours notice.',
				'cateringCta'        => array( 'label' => 'Explore Catering', 'href' => '', 'variant' => 'light' ),
			),
			'finalCta'      => array(
				'eyebrow'      => 'READY TO ORDER?',
				'title'        => 'Start with a signature burrito. Add the tots. Make the morning better.',
				'body'         => 'Use this final section to push directly into the live ordering flow.',
				'primaryCta'   => array( 'label' => 'Order Now', 'href' => '', 'variant' => 'light' ),
				'secondaryCta' => array( 'label' => 'View Menu', 'href' => '#menu', 'variant' => 'secondary' ),
			),
			'footer'        => array(
				'navigateHeading' => 'Navigate',
				'visitHeading'    => 'Visit',
				'orderHeading'    => 'Order and Social',
				'description' => 'Breakfast burritos, frescas, and loaded sides served daily in Agoura Hills.',
				'visit'       => array( '28708 Roadside Drive', 'Agoura Hills, CA 91301', 'Open daily', '8:00 AM - 3:00 PM' ),
				'order'       => array( 'Toast online ordering', 'Gift cards', 'Delivery', 'Catering', 'Instagram' ),
			),
			'seo'           => array(
				'siteUrl'     => '',
				'title'       => "Frankie's Breakfast Burritos | Agoura Hills Breakfast Burritos",
				'description' => 'Fire-grilled breakfast burritos in Agoura Hills with pickup, catering, and online ordering.',
				'keywords'    => 'breakfast burritos agoura hills, frankies breakfast burritos, breakfast near me',
				'ogImage'     => '',
				'sameAs'      => array(),
				'noindex'     => false,
			),
			'integration'   => array(
				'previewToken'          => '',
				'frontendRevalidateUrl' => '',
				'revalidateSecret'      => '',
				'gaMeasurementId'       => '',
			),
		);
	}

	private function get_settings() {
		$current = get_option( self::OPTION_KEY, array() );
		return $this->merge_recursive( $this->default_settings(), is_array( $current ) ? $current : array() );
	}

	private function merge_recursive( array $defaults, array $current ) {
		foreach ( $current as $key => $value ) {
			if ( isset( $defaults[ $key ] ) && is_array( $defaults[ $key ] ) && is_array( $value ) && $this->is_associative( $defaults[ $key ] ) ) {
				$defaults[ $key ] = $this->merge_recursive( $defaults[ $key ], $value );
			} else {
				$defaults[ $key ] = $value;
			}
		}

		return $defaults;
	}

	private function is_associative( array $value ) {
		return array_keys( $value ) !== range( 0, count( $value ) - 1 );
	}

	private function field_map() {
		return array(
			'site.announcement'                 => array( 'label' => 'Announcement', 'type' => 'textarea' ),
			'site.siteName'                     => array( 'label' => 'Site name', 'type' => 'text' ),
			'site.siteTagline'                  => array( 'label' => 'Site tagline', 'type' => 'text' ),
			'site.logoUrl'                      => array( 'label' => 'Site logo image URL', 'type' => 'url' ),
			'site.logoAlt'                      => array( 'label' => 'Site logo alt text', 'type' => 'text' ),
			'navigation'                        => array( 'label' => 'Navigation JSON fallback', 'type' => 'json', 'help' => 'Used only if no Primary Navigation menu is assigned under Appearance > Menus.' ),
			'hero.title'                        => array( 'label' => 'Hero title', 'type' => 'textarea' ),
			'hero.backgroundImage'              => array( 'label' => 'Hero desktop image URL', 'type' => 'url' ),
			'hero.mobileImage'                  => array( 'label' => 'Hero mobile image URL', 'type' => 'url' ),
			'hero.primaryCta.label'             => array( 'label' => 'Hero primary CTA label', 'type' => 'text' ),
			'hero.primaryCta.href'              => array( 'label' => 'Hero primary CTA href', 'type' => 'text' ),
			'hero.primaryCta.variant'           => array( 'label' => 'Hero primary CTA variant', 'type' => 'text' ),
			'hero.secondaryCta.label'           => array( 'label' => 'Hero secondary CTA label', 'type' => 'text' ),
			'hero.secondaryCta.href'            => array( 'label' => 'Hero secondary CTA href', 'type' => 'text' ),
			'hero.secondaryCta.variant'         => array( 'label' => 'Hero secondary CTA variant', 'type' => 'text' ),
			'featuredIntro.eyebrow'             => array( 'label' => 'Featured eyebrow', 'type' => 'text' ),
			'featuredIntro.title'               => array( 'label' => 'Featured title', 'type' => 'textarea' ),
			'featuredIntro.cta.label'           => array( 'label' => 'Featured CTA label', 'type' => 'text' ),
			'featuredIntro.cta.href'            => array( 'label' => 'Featured CTA href', 'type' => 'text' ),
			'featuredIntro.cta.variant'         => array( 'label' => 'Featured CTA variant', 'type' => 'text' ),
			'reasons.eyebrow'                   => array( 'label' => 'Reasons eyebrow', 'type' => 'text' ),
			'reasons.title'                     => array( 'label' => 'Reasons title', 'type' => 'textarea' ),
			'reasons.body'                      => array( 'label' => 'Reasons body', 'type' => 'textarea' ),
			'reasons.items'                     => array( 'label' => 'Reasons items JSON', 'type' => 'json', 'help' => 'Array of { "number": "01", "title": "...", "body": "..." }.' ),
			'menu.eyebrow'                      => array( 'label' => 'Menu eyebrow', 'type' => 'text' ),
			'menu.title'                        => array( 'label' => 'Menu title', 'type' => 'textarea' ),
			'menu.body'                         => array( 'label' => 'Menu body', 'type' => 'textarea' ),
			'menu.note'                         => array( 'label' => 'Menu note', 'type' => 'textarea' ),
			'menu.image'                        => array( 'label' => 'Menu image URL', 'type' => 'url' ),
			'menu.imageAlt'                     => array( 'label' => 'Menu image alt text', 'type' => 'text' ),
			'menu.categoryFocusTitle'           => array( 'label' => 'Menu category focus title', 'type' => 'text' ),
			'menu.categoryFocusBody'            => array( 'label' => 'Menu category focus body', 'type' => 'textarea' ),
			'menu.itemCtaLabel'                 => array( 'label' => 'Featured item CTA label', 'type' => 'text' ),
			'menu.footerNote'                   => array( 'label' => 'Menu footer note', 'type' => 'textarea' ),
			'menu.footerCta.label'              => array( 'label' => 'Menu footer CTA label', 'type' => 'text' ),
			'menu.footerCta.href'               => array( 'label' => 'Menu footer CTA href', 'type' => 'text' ),
			'menu.footerCta.variant'            => array( 'label' => 'Menu footer CTA variant', 'type' => 'text' ),
			'about.eyebrow'                     => array( 'label' => 'About eyebrow', 'type' => 'text' ),
			'about.title'                       => array( 'label' => 'About title', 'type' => 'textarea' ),
			'about.paragraphs'                  => array( 'label' => 'About paragraphs JSON', 'type' => 'json' ),
			'about.image'                       => array( 'label' => 'About image URL', 'type' => 'url' ),
			'about.facts'                       => array( 'label' => 'About facts JSON', 'type' => 'json', 'help' => 'Array of { "value": "...", "label": "..." }.' ),
			'proof.eyebrow'                     => array( 'label' => 'Proof eyebrow', 'type' => 'text' ),
			'proof.title'                       => array( 'label' => 'Proof title', 'type' => 'textarea' ),
			'proof.body'                        => array( 'label' => 'Proof body', 'type' => 'textarea' ),
			'proof.backgroundImage'             => array( 'label' => 'Proof background image URL', 'type' => 'url' ),
			'location.eyebrow'                  => array( 'label' => 'Location eyebrow', 'type' => 'text' ),
			'location.title'                    => array( 'label' => 'Location title', 'type' => 'textarea' ),
			'location.name'                     => array( 'label' => 'Location name', 'type' => 'text' ),
			'location.address'                  => array( 'label' => 'Street address', 'type' => 'text' ),
			'location.city'                     => array( 'label' => 'City', 'type' => 'text' ),
			'location.region'                   => array( 'label' => 'Region/state', 'type' => 'text' ),
			'location.postalCode'               => array( 'label' => 'Postal code', 'type' => 'text' ),
			'location.country'                  => array( 'label' => 'Country code', 'type' => 'text' ),
			'location.phone'                    => array( 'label' => 'Phone', 'type' => 'text' ),
			'location.hours'                    => array( 'label' => 'Hours summary', 'type' => 'text' ),
			'location.openingHoursSchema'       => array( 'label' => 'Opening hours schema JSON', 'type' => 'json', 'help' => 'Array like ["Mo-Su 08:00-15:00"].' ),
			'location.ordering'                 => array( 'label' => 'Ordering text', 'type' => 'textarea' ),
			'location.orderUrl'                 => array( 'label' => 'Primary ordering URL', 'type' => 'url', 'help' => 'Default destination for order-related CTAs when their href is blank.' ),
			'location.primaryCta.label'         => array( 'label' => 'Location primary CTA label', 'type' => 'text' ),
			'location.primaryCta.href'          => array( 'label' => 'Location primary CTA href', 'type' => 'text' ),
			'location.primaryCta.variant'       => array( 'label' => 'Location primary CTA variant', 'type' => 'text' ),
			'location.secondaryCta.label'       => array( 'label' => 'Location secondary CTA label', 'type' => 'text' ),
			'location.secondaryCta.href'        => array( 'label' => 'Location secondary CTA href', 'type' => 'text' ),
			'location.secondaryCta.variant'     => array( 'label' => 'Location secondary CTA variant', 'type' => 'text' ),
			'location.mapTitle'                 => array( 'label' => 'Map title', 'type' => 'text' ),
			'location.mapBody'                  => array( 'label' => 'Map body', 'type' => 'textarea' ),
			'location.mapEmbedUrl'              => array( 'label' => 'Map embed URL', 'type' => 'url' ),
			'location.cateringText'             => array( 'label' => 'Catering text', 'type' => 'textarea' ),
			'location.cateringCta.label'        => array( 'label' => 'Catering CTA label', 'type' => 'text' ),
			'location.cateringCta.href'         => array( 'label' => 'Catering CTA href', 'type' => 'text' ),
			'location.cateringCta.variant'      => array( 'label' => 'Catering CTA variant', 'type' => 'text' ),
			'finalCta.eyebrow'                  => array( 'label' => 'Final CTA eyebrow', 'type' => 'text' ),
			'finalCta.title'                    => array( 'label' => 'Final CTA title', 'type' => 'textarea' ),
			'finalCta.body'                     => array( 'label' => 'Final CTA body', 'type' => 'textarea' ),
			'finalCta.primaryCta.label'         => array( 'label' => 'Final primary CTA label', 'type' => 'text' ),
			'finalCta.primaryCta.href'          => array( 'label' => 'Final primary CTA href', 'type' => 'text' ),
			'finalCta.primaryCta.variant'       => array( 'label' => 'Final primary CTA variant', 'type' => 'text' ),
			'finalCta.secondaryCta.label'       => array( 'label' => 'Final secondary CTA label', 'type' => 'text' ),
			'finalCta.secondaryCta.href'        => array( 'label' => 'Final secondary CTA href', 'type' => 'text' ),
			'finalCta.secondaryCta.variant'     => array( 'label' => 'Final secondary CTA variant', 'type' => 'text' ),
			'footer.navigateHeading'            => array( 'label' => 'Footer navigate heading', 'type' => 'text' ),
			'footer.visitHeading'               => array( 'label' => 'Footer visit heading', 'type' => 'text' ),
			'footer.orderHeading'               => array( 'label' => 'Footer order heading', 'type' => 'text' ),
			'footer.description'                => array( 'label' => 'Footer description', 'type' => 'textarea' ),
			'footer.visit'                      => array( 'label' => 'Footer visit lines JSON', 'type' => 'json' ),
			'footer.order'                      => array( 'label' => 'Footer order lines JSON', 'type' => 'json' ),
			'seo.siteUrl'                       => array( 'label' => 'Canonical site URL', 'type' => 'url' ),
			'seo.title'                         => array( 'label' => 'SEO title', 'type' => 'text' ),
			'seo.description'                   => array( 'label' => 'SEO description', 'type' => 'textarea' ),
			'seo.keywords'                      => array( 'label' => 'SEO keywords', 'type' => 'textarea' ),
			'seo.ogImage'                       => array( 'label' => 'Open Graph image URL', 'type' => 'url' ),
			'seo.sameAs'                        => array( 'label' => 'SameAs JSON', 'type' => 'json' ),
			'seo.noindex'                       => array( 'label' => 'Noindex site', 'type' => 'boolean' ),
			'integration.previewToken'          => array( 'label' => 'Preview token', 'type' => 'text' ),
			'integration.frontendRevalidateUrl' => array( 'label' => 'Frontend revalidate webhook URL', 'type' => 'url' ),
			'integration.revalidateSecret'      => array( 'label' => 'Revalidate secret', 'type' => 'text' ),
			'integration.gaMeasurementId'       => array( 'label' => 'GA4 measurement ID', 'type' => 'text' ),
		);
	}

	private function field_name( $path ) {
		$segments = explode( '.', $path );
		$base = self::OPTION_KEY;
		foreach ( $segments as $segment ) {
			$base .= '[' . $segment . ']';
		}

		return $base;
	}

	private function field_id( $path ) {
		return 'frankies-' . str_replace( '.', '-', $path );
	}

	private function array_get( $source, $path ) {
		$segments = explode( '.', $path );
		$value = $source;

		foreach ( $segments as $segment ) {
			if ( ! is_array( $value ) || ! array_key_exists( $segment, $value ) ) {
				return null;
			}

			$value = $value[ $segment ];
		}

		return $value;
	}

	private function array_set( array &$source, $path, $value ) {
		$segments = explode( '.', $path );
		$ref = &$source;

		foreach ( $segments as $segment ) {
			if ( ! isset( $ref[ $segment ] ) || ! is_array( $ref[ $segment ] ) ) {
				$ref[ $segment ] = array();
			}
			$ref = &$ref[ $segment ];
		}

		$ref = $value;
	}
}

register_activation_hook( __FILE__, array( 'Frankies_Headless_Plugin', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'Frankies_Headless_Plugin', 'deactivate' ) );
Frankies_Headless_Plugin::instance();
