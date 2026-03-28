<?php
/**
 * MU loader for the Frankies headless plugin.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'frankies_headless_should_trim_active_plugins' ) ) {
	/**
	 * Trim heavyweight plugins for public headless REST reads.
	 *
	 * This keeps the editorial/admin plugin stack intact in wp-admin while
	 * avoiding unnecessary plugin bootstrap work for read-only API traffic.
	 *
	 * @return bool
	 */
	function frankies_headless_should_trim_active_plugins() {
		if ( 'cli' === PHP_SAPI ) {
			return false;
		}

		$method = isset( $_SERVER['REQUEST_METHOD'] ) ? strtoupper( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) ) : 'GET';
		if ( ! in_array( $method, array( 'GET', 'HEAD', 'OPTIONS' ), true ) ) {
			return false;
		}

		$request_uri = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : '';
		if ( '' === $request_uri ) {
			return false;
		}

		$path = wp_parse_url( $request_uri, PHP_URL_PATH );
		if ( ! is_string( $path ) || '' === $path ) {
			return false;
		}

		return false !== strpos( $path, '/wp-json/frankies/v1/' ) || false !== strpos( $path, '/wp-json/frankies-headless/v1/' );
	}
}

if ( ! function_exists( 'frankies_headless_filter_active_plugins' ) ) {
	/**
	 * Disable plugins that do not participate in public headless content reads.
	 *
	 * @param array $plugins Active plugin basenames.
	 * @return array
	 */
	function frankies_headless_filter_active_plugins( $plugins ) {
		if ( ! frankies_headless_should_trim_active_plugins() || ! is_array( $plugins ) ) {
			return $plugins;
		}

		$disabled = array(
			'akismet/akismet.php',
			'all-in-one-wp-migration/all-in-one-wp-migration.php',
			'facebook-for-woocommerce/facebook-for-woocommerce.php',
			'klaviyo/klaviyo.php',
			'reddit-for-woocommerce/reddit-for-woocommerce.php',
			'snapchat-for-woocommerce/snapchat-for-woocommerce.php',
			'woocommerce-payments/woocommerce-payments.php',
			'woocommerce-services/woocommerce-services.php',
			'woocommerce-shipping/woocommerce-shipping.php',
		);

		return array_values( array_diff( $plugins, $disabled ) );
	}
}

add_filter( 'option_active_plugins', 'frankies_headless_filter_active_plugins', 1 );

require_once WPMU_PLUGIN_DIR . '/../plugins/frankies-headless/frankies-headless.php';
