<?php

namespace Automattic\WCShipping\FeatureFlags;

use Automattic\WCShipping\Connect\WC_Connect_Options;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class FeatureFlags {

	/**
	 * Features supported by the store.
	 *
	 * Please do not use this constant directly - instead, use the
	 * `wcshipping_features_supported_by_store` filter.
	 *
	 * @var string[]
	 */
	const FEATURES_SUPPORTED_BY_STORE = array( 'upsdap' );

	public function register_hooks() {
		add_filter( 'wcshipping_api_client_body', array( $this, 'decorate_api_request_body_with_feature_flags' ) );
		add_filter( 'wcshipping_features_supported_by_store', array( $this, 'get_features_supported_by_store' ) );
	}

	public function decorate_api_request_body_with_feature_flags( array $body ): array {
		$body['settings']['features_supported_by_store'] = apply_filters( 'wcshipping_features_supported_by_store', array() );

		// Pass `features_supported_by_client` as part of `settings`.
		if ( isset( $body['features_supported_by_client'] ) ) {
			$body['settings']['features_supported_by_client'] = $body['features_supported_by_client'];
			unset( $body['features_supported_by_client'] );
		}

		return $body;
	}

	/**
	 * Get features supported by the store.
	 *
	 * @return string[]
	 */
	public function get_features_supported_by_store(): array {
		return self::FEATURES_SUPPORTED_BY_STORE;
	}

	/**
	 * Check if ScanForm feature is enabled.
	 *
	 * Checks the user setting from account_settings, with a filter to override.
	 *
	 * @return bool
	 */
	public static function is_scanform_enabled(): bool {
		$account_settings   = WC_Connect_Options::get_option( 'account_settings', array() );
		$enabled_by_setting = ! isset( $account_settings['scanform_enabled'] ) || ! empty( $account_settings['scanform_enabled'] );

		/**
		 * Filter to enable/disable USPS ScanForm feature.
		 *
		 * @param bool $enable_scanform Whether to enable the ScanForm feature. Defaults to the user setting value.
		 */
		return apply_filters( 'wcshipping_enable_scanform_feature', $enabled_by_setting );
	}
}
