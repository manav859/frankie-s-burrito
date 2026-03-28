<?php
/**
 * Shared payload helpers for Frankie's headless API.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Frankies_Headless_Api {
	public function decode_public_text( $value ) {
		$value = (string) $value;

		if ( '' === $value ) {
			return '';
		}

		$decoded = $value;

		for ( $index = 0; $index < 3; $index++ ) {
			$next = html_entity_decode( wp_specialchars_decode( $decoded, ENT_QUOTES ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );

			if ( $next === $decoded ) {
				break;
			}

			$decoded = $next;
		}

		return $decoded;
	}

	public function decode_public_plain_text( $value ) {
		return wp_strip_all_tags( $this->decode_public_text( $value ) );
	}

	public function get_product_badge( WC_Product $product ) {
		$badge = sanitize_key( (string) get_post_meta( $product->get_id(), '_frankies_badge', true ) );
		return in_array( $badge, array( 'featured', 'popular' ), true ) ? $badge : '';
	}

	public function get_product_availability( WC_Product $product ) {
		$availability = sanitize_key( (string) get_post_meta( $product->get_id(), '_frankies_availability', true ) );

		if ( ! in_array( $availability, array( 'available', 'unavailable' ), true ) ) {
			$availability = $product->is_purchasable() && $product->is_in_stock() ? 'available' : 'unavailable';
		}

		return $availability;
	}

	public function get_product_sort_order( WC_Product $product ) {
		$product_post = get_post( $product->get_id() );
		return $product_post instanceof WP_Post ? (int) $product_post->menu_order : 0;
	}

	public function get_product_card_description( WC_Product $product ) {
		$override = (string) get_post_meta( $product->get_id(), '_frankies_card_description', true );

		if ( '' !== trim( $override ) ) {
			return $this->decode_public_plain_text( $override );
		}

		return $this->decode_public_plain_text( $product->get_short_description() ?: $product->get_description() );
	}

	public function get_product_estimated_prep_minutes( WC_Product $product ) {
		$minutes = absint( get_post_meta( $product->get_id(), '_frankies_estimated_prep_minutes', true ) );
		return max( 0, $minutes );
	}

	public function normalize_public_url( $url ) {
		$url = trim( (string) $url );

		if ( '' === $url ) {
			return '';
		}

		if ( 0 === strpos( $url, '//' ) ) {
			$scheme = is_ssl() ? 'https:' : 'http:';
			return esc_url_raw( $scheme . $url );
		}

		if ( preg_match( '#^https?://#i', $url ) ) {
			return esc_url_raw( $url );
		}

		return esc_url_raw( home_url( '/' . ltrim( $url, '/' ) ) );
	}

	public function get_attachment_payload( $attachment_id, $size = 'large' ) {
		$attachment_id = (int) $attachment_id;

		if ( $attachment_id <= 0 ) {
			return array(
				'url' => '',
				'alt' => '',
			);
		}

		$image = wp_get_attachment_image_src( $attachment_id, $size );

		return array(
			'url' => $image ? $this->normalize_public_url( $image[0] ) : '',
			'alt' => (string) get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ),
		);
	}

	public function get_product_image_payload( WC_Product $product, $size = 'large' ) {
		$image_id = (int) $product->get_image_id();
		$image = $this->get_attachment_payload( $image_id, $size );

		if ( '' === $image['url'] && function_exists( 'wc_placeholder_img_src' ) ) {
			$image['url'] = $this->normalize_public_url( wc_placeholder_img_src() );
			$image['alt'] = $this->decode_public_plain_text( $product->get_name() );
		}

		$image['alt'] = $this->decode_public_plain_text( $image['alt'] ?: $product->get_name() );

		return $image;
	}

	public function get_product_gallery_payload( WC_Product $product, $size = 'large' ) {
		$gallery = array();

		foreach ( $product->get_gallery_image_ids() as $attachment_id ) {
			$gallery[] = $this->get_attachment_payload( $attachment_id, $size );
		}

		return array_values(
			array_filter(
				$gallery,
				function( $image ) {
					return ! empty( $image['url'] );
				}
			)
		);
	}

	public function get_term_image_payload( WP_Term $term, $size = 'large' ) {
		$thumbnail_id = (int) get_term_meta( $term->term_id, 'thumbnail_id', true );

		if ( $thumbnail_id > 0 ) {
			return $this->get_attachment_payload( $thumbnail_id, $size );
		}

		$fallback = $this->normalize_public_url( (string) get_term_meta( $term->term_id, '_frankies_image', true ) );

		return array(
			'url' => $fallback ?: ( function_exists( 'wc_placeholder_img_src' ) ? $this->normalize_public_url( wc_placeholder_img_src() ) : '' ),
			'alt' => $this->decode_public_plain_text( $term->name ),
		);
	}

	public function format_money( $amount ) {
		$amount = wc_format_decimal( $amount, wc_get_price_decimals() );

		return array(
			'raw'       => (string) $amount,
			'formatted' => wp_strip_all_tags( html_entity_decode( wc_price( $amount ) ) ),
			'currency'  => get_woocommerce_currency(),
			'symbol'    => html_entity_decode( get_woocommerce_currency_symbol() ),
		);
	}

	public function map_term_summary( WP_Term $term ) {
		$image = $this->get_term_image_payload( $term );

		return array(
			'id'           => (int) $term->term_id,
			'slug'         => $term->slug,
			'name'         => $this->decode_public_plain_text( $term->name ),
			'description'  => $this->decode_public_plain_text( term_description( $term ) ),
			'image'        => $image['url'],
			'image_alt'    => $this->decode_public_plain_text( $image['alt'] ),
			'cta_label'    => $this->decode_public_plain_text( get_term_meta( $term->term_id, '_frankies_cta_label', true ) ?: $term->name ),
			'display_order'=> (int) get_term_meta( $term->term_id, '_frankies_display_order', true ),
			'item_count'   => (int) $term->count,
		);
	}

	public function map_product_card( WC_Product $product ) {
		$image = $this->get_product_image_payload( $product );
		$categories = get_the_terms( $product->get_id(), 'product_cat' );
		$price = $this->format_money( $product->get_price() );

		if ( empty( $image['url'] ) ) {
			/**
			 * Fires when a public menu payload is built for a product without a product image.
			 *
			 * @param int $product_id Product ID.
			 */
			do_action( 'frankies_headless_missing_product_image', $product->get_id() );
		}

		return array(
			'id'                => (int) $product->get_id(),
			'slug'              => $product->get_slug(),
			'sku'               => (string) $product->get_sku(),
			'name'              => $this->decode_public_plain_text( $product->get_name() ),
			'image'             => $image['url'],
			'image_alt'         => $this->decode_public_plain_text( $image['alt'] ),
			'short_description' => $this->get_product_card_description( $product ),
			'description'       => wp_kses_post( $product->get_description() ),
			'base_price'        => $price['raw'],
			'formatted_price'   => $price['formatted'],
			'price'             => $price,
			'categories'        => is_wp_error( $categories ) || empty( $categories ) ? array() : array_map(
				function( $term ) {
					return array(
						'id'   => (int) $term->term_id,
						'slug' => $term->slug,
						'name' => $this->decode_public_plain_text( $term->name ),
					);
				},
				$categories
			),
			'badge'             => $this->get_product_badge( $product ),
			'is_featured'       => (bool) get_post_meta( $product->get_id(), '_frankies_featured_product', true ),
			'dark'              => (bool) get_post_meta( $product->get_id(), '_frankies_featured_dark', true ),
			'availability'      => $this->get_product_availability( $product ),
			'fulfillment_mode'  => sanitize_key( (string) get_post_meta( $product->get_id(), '_frankies_fulfillment_mode', true ) ?: 'both' ),
			'sort_order'        => $this->get_product_sort_order( $product ),
			'estimated_prep_minutes' => $this->get_product_estimated_prep_minutes( $product ),
			'upsell_ids'        => array_map( 'intval', $product->get_upsell_ids() ),
		);
	}
}
