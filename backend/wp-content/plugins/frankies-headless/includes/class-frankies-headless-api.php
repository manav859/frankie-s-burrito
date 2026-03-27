<?php
/**
 * Shared payload helpers for Frankie's headless API.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Frankies_Headless_Api {
	private function get_attachment_alt( $attachment_id, $fallback = '' ) {
		$alt = trim( (string) get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ) );

		if ( '' !== $alt ) {
			return $alt;
		}

		$title = trim( (string) get_the_title( $attachment_id ) );
		if ( '' !== $title ) {
			return $title;
		}

		return trim( (string) $fallback );
	}

	private function normalize_srcset( $srcset ) {
		$srcset = trim( (string) $srcset );

		if ( '' === $srcset ) {
			return '';
		}

		$candidates = array();
		foreach ( explode( ',', $srcset ) as $candidate ) {
			$candidate = trim( $candidate );
			if ( '' === $candidate ) {
				continue;
			}

			$parts = preg_split( '/\s+/', $candidate, 2 );
			if ( empty( $parts[0] ) ) {
				continue;
			}

			$url = $this->normalize_public_url( $parts[0] );
			$descriptor = isset( $parts[1] ) ? trim( $parts[1] ) : '';
			$candidates[] = $descriptor ? $url . ' ' . $descriptor : $url;
		}

		return implode( ', ', $candidates );
	}

	private function get_attachment_sources( $attachment_id ) {
		$sources = array();
		$preferred_sizes = array( 'thumbnail', 'medium', 'medium_large', 'large', 'full', 'woocommerce_thumbnail', 'woocommerce_single', 'woocommerce_gallery_thumbnail' );

		foreach ( array_unique( $preferred_sizes ) as $size ) {
			$image = wp_get_attachment_image_src( $attachment_id, $size );
			if ( ! is_array( $image ) || empty( $image[0] ) ) {
				continue;
			}

			$sources[ (string) $size ] = array(
				'url'    => $this->normalize_public_url( $image[0] ),
				'width'  => isset( $image[1] ) ? (int) $image[1] : 0,
				'height' => isset( $image[2] ) ? (int) $image[2] : 0,
			);
		}

		return $sources;
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
			return wp_strip_all_tags( $override );
		}

		return wp_strip_all_tags( $product->get_short_description() ?: $product->get_description() );
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

	public function get_attachment_payload( $attachment_id, $size = 'large', $fallback_alt = '' ) {
		$attachment_id = (int) $attachment_id;

		if ( $attachment_id <= 0 ) {
			return array(
				'id'       => 0,
				'url'      => '',
				'alt'      => trim( (string) $fallback_alt ),
				'width'    => 0,
				'height'   => 0,
				'mimeType' => '',
				'srcset'   => '',
				'sources'  => array(),
			);
		}

		$image = wp_get_attachment_image_src( $attachment_id, $size );
		$full = wp_get_attachment_image_src( $attachment_id, 'full' );
		$mime_type = (string) get_post_mime_type( $attachment_id );
		$alt = $this->get_attachment_alt( $attachment_id, $fallback_alt );

		return array(
			'id'       => $attachment_id,
			'url'      => $image ? $this->normalize_public_url( $image[0] ) : '',
			'alt'      => $alt,
			'width'    => $full && isset( $full[1] ) ? (int) $full[1] : ( $image && isset( $image[1] ) ? (int) $image[1] : 0 ),
			'height'   => $full && isset( $full[2] ) ? (int) $full[2] : ( $image && isset( $image[2] ) ? (int) $image[2] : 0 ),
			'mimeType' => $mime_type,
			'srcset'   => $this->normalize_srcset( wp_get_attachment_image_srcset( $attachment_id, $size ) ),
			'sources'  => $this->get_attachment_sources( $attachment_id ),
		);
	}

	public function get_media_payload_from_url( $url, $fallback_alt = '', $size = 'large' ) {
		$normalized_url = $this->normalize_public_url( $url );

		if ( '' === $normalized_url ) {
			return array(
				'id'       => 0,
				'url'      => '',
				'alt'      => trim( (string) $fallback_alt ),
				'width'    => 0,
				'height'   => 0,
				'mimeType' => '',
				'srcset'   => '',
				'sources'  => array(),
			);
		}

		$attachment_id = attachment_url_to_postid( $normalized_url );
		if ( $attachment_id > 0 ) {
			return $this->get_attachment_payload( $attachment_id, $size, $fallback_alt );
		}

		return array(
			'id'       => 0,
			'url'      => $normalized_url,
			'alt'      => trim( (string) $fallback_alt ),
			'width'    => 0,
			'height'   => 0,
			'mimeType' => '',
			'srcset'   => '',
			'sources'  => array(),
		);
	}

	public function get_product_image_payload( WC_Product $product, $size = 'large' ) {
		$image_id = (int) $product->get_image_id();
		$image = $this->get_attachment_payload( $image_id, $size, $product->get_name() );

		if ( '' === $image['url'] && function_exists( 'wc_placeholder_img_src' ) ) {
			$image['url'] = $this->normalize_public_url( wc_placeholder_img_src() );
			$image['alt'] = $product->get_name();
		}

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
			return $this->get_attachment_payload( $thumbnail_id, $size, $term->name );
		}

		$fallback = (string) get_term_meta( $term->term_id, '_frankies_image', true );
		$image = $this->get_media_payload_from_url( $fallback, $term->name, $size );

		if ( '' === $image['url'] && function_exists( 'wc_placeholder_img_src' ) ) {
			$image['url'] = $this->normalize_public_url( wc_placeholder_img_src() );
			$image['alt'] = $term->name;
		}

		return $image;
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
			'name'         => $term->name,
			'description'  => wp_strip_all_tags( term_description( $term ) ),
			'image'        => $image['url'],
			'image_alt'    => $image['alt'],
			'image_data'   => $image,
			'cta_label'    => (string) ( get_term_meta( $term->term_id, '_frankies_cta_label', true ) ?: $term->name ),
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
			'name'              => $product->get_name(),
			'image'             => $image['url'],
			'image_alt'         => $image['alt'],
			'image_data'        => $image,
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
						'name' => $term->name,
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
