# Frankies Headless WooCommerce API

This plugin now exposes a headless ordering layer on top of WooCommerce under:

- `wp-json/frankies/v1` for ordering/cart/checkout
- `wp-json/frankies-headless/v1` for menu browsing payloads

## Endpoints

- `GET /menu`
- `GET /menu/{slug}`
- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/{itemKey}`
- `DELETE /cart/items/{itemKey}`
- `POST /checkout/options`
- `POST /checkout`
- `GET /orders/{orderId}/confirmation?key={orderKey}`

## Menu API

- `GET /wp-json/frankies-headless/v1/menu`
- `GET /wp-json/frankies-headless/v1/menu/categories`
- `GET /wp-json/frankies-headless/v1/menu/items`
- `GET /wp-json/frankies-headless/v1/menu/items/{id-or-slug}`
- `GET /wp-json/frankies-headless/v1/menu/bootstrap`

Supported query params for `menu/items`:

- `category`
- `featured`
- `search`
- `availability`
- `limit`

Supported query params for `menu/bootstrap`:

- `initial`
- `limit`

Example `GET /menu/categories` response:

```json
{
  "items": [
    {
      "id": 12,
      "slug": "breakfast-burritos",
      "name": "Breakfast Burritos",
      "image": "https://example.com/wp-content/uploads/burritos.jpg",
      "image_alt": "Breakfast Burritos",
      "count": 8,
      "sort_order": 1,
      "description": "",
      "cta_label": "Breakfast Burritos"
    }
  ]
}
```

Example `GET /menu/items/{slug}` response:

```json
{
  "id": 101,
  "slug": "the-og-burrito",
  "name": "The OG Burrito",
  "image": "https://example.com/wp-content/uploads/og.jpg",
  "gallery": ["https://example.com/wp-content/uploads/og-detail.jpg"],
  "categories": [{"id": 12, "slug": "breakfast-burritos", "name": "Breakfast Burritos"}],
  "short_description": "Bacon, eggs, tots, cheese.",
  "description": "<p>Full item detail body.</p>",
  "base_price": "12.00",
  "formatted_price": "$12.00",
  "badge": "popular",
  "spice_options": [{"key": "mild", "label": "Mild", "price_adjustment": "0.00"}],
  "addon_groups": [{"key": "extras", "label": "Add-ons", "type": "checkbox", "min": 0, "max": 4, "options": [{"key": "guac", "label": "Guac", "price_adjustment": {"raw": "2.00", "formatted": "$2.00"}}]}],
  "upsell_products": [],
  "availability": "available",
  "fulfillment_mode": "both",
  "sort_order": 1
}
```

## Headless Cart API

- `GET /wp-json/frankies-headless/v1/cart`
- `POST /wp-json/frankies-headless/v1/cart/add`
- `POST /wp-json/frankies-headless/v1/cart/update`
- `POST /wp-json/frankies-headless/v1/cart/remove`
- `POST /wp-json/frankies-headless/v1/cart/clear`

Frontend integration notes:

- Send the cart token in `X-Frankies-Cart-Token`.
- If the frontend has no token yet, call `GET /cart` or `POST /cart/add`; the response includes `cart_token`.
- Guest carts are supported via WooCommerce session storage plus the cart token bridge.
- Cart customizations must be sent as:
  - `product_id`
  - `quantity`
  - `spice_level`
  - `addons`
- Invalid or unavailable options return a `4xx` error with a readable message.

Example `POST /cart/add` body:

```json
{
  "product_id": 101,
  "quantity": 2,
  "spice_level": "medium-jalapeno",
  "addons": ["guac", "extra-bacon"]
}
```

Example cart response:

```json
{
  "cart_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "items": [
    {
      "key": "0d3c1d...",
      "product_id": 101,
      "name": "The OG Burrito",
      "image": "https://example.com/wp-content/uploads/og.jpg",
      "quantity": 2,
      "unit_price": { "raw": "17.00", "formatted": "$17.00", "currency": "USD", "symbol": "$" },
      "line_subtotal": { "raw": "34.00", "formatted": "$34.00", "currency": "USD", "symbol": "$" },
      "line_total": { "raw": "34.00", "formatted": "$34.00", "currency": "USD", "symbol": "$" },
      "selected_options": {
        "spice_level": { "key": "medium-jalapeno", "label": "Medium (Jalapeno)", "price_adjustment": { "raw": "0.00", "formatted": "$0.00", "currency": "USD", "symbol": "$" } },
        "addons": [
          { "key": "guac", "label": "Guac", "price_adjustment": { "raw": "2.00", "formatted": "$2.00", "currency": "USD", "symbol": "$" } }
        ]
      },
      "summary_lines": ["Spice: Medium (Jalapeno)", "Add-on: Guac"]
    }
  ],
  "item_count": 2,
  "subtotal": { "raw": "34.00", "formatted": "$34.00", "currency": "USD", "symbol": "$" },
  "taxes": { "raw": "0.00", "formatted": "$0.00", "currency": "USD", "symbol": "$" },
  "fees": { "raw": "0.00", "formatted": "$0.00", "currency": "USD", "symbol": "$" },
  "total": { "raw": "34.00", "formatted": "$34.00", "currency": "USD", "symbol": "$" },
  "currency": "USD",
  "available_upsells": []
}
```

## Headless Checkout API

- `GET /wp-json/frankies-headless/v1/checkout/config`
- `POST /wp-json/frankies-headless/v1/checkout/validate`
- `POST /wp-json/frankies-headless/v1/checkout/place-order`
- `GET /wp-json/frankies-headless/v1/orders/{orderId}/confirmation?key={orderKey}`

Checkout fields expected by the API:

- `fulfillment_type`
- `full_name`
- `mobile_number`
- `delivery_method` for delivery orders when WooCommerce shipping exposes one or more delivery methods
- `address.street_address`
- `address.city`
- `address.state`
- `address.postcode`
- `address.country`

Behavior:

- `pickup` requires name and mobile
- `delivery` requires address fields and a delivery method when shipping methods are configured
- order metadata saved:
  - `fulfillment_type`
  - `customer_phone`
  - `estimated_ready_time`
  - `_frankies_delivery_method`
- cart item customizations are copied into order item meta

Payment status note:

- Payment integration is intentionally disabled for now and should be finalized after client consultation.
- Orders are created in a deferred/on-hold state so frontend checkout can ship without locking the project into a gateway prematurely.

Example `POST /checkout/place-order` body:

```json
{
  "fulfillment_type": "delivery",
  "full_name": "Frankie Burrito",
  "mobile_number": "+918888888888",
  "delivery_method": "flat_rate:3",
  "address": {
    "street_address": "123 Main Street",
    "city": "Agoura Hills",
    "state": "CA",
    "postcode": "91301",
    "country": "US"
  }
}
```

Example order confirmation response:

```json
{
  "order_id": 1201,
  "order_number": "1201",
  "payment_status": "deferred",
  "status": "on-hold",
  "fulfillment_type": "delivery",
  "customer_phone": "+918888888888",
  "estimated_ready_time": "2026-03-25T09:10:00+00:00",
  "delivery_method": "flat_rate:3",
  "subtotal": { "raw": "20.00", "formatted": "$20.00", "currency": "USD", "symbol": "$" },
  "taxes": { "raw": "4.00", "formatted": "$4.00", "currency": "USD", "symbol": "$" },
  "fees": { "raw": "0.00", "formatted": "$0.00", "currency": "USD", "symbol": "$" },
  "total": { "raw": "24.00", "formatted": "$24.00", "currency": "USD", "symbol": "$" },
  "item_summary": [],
  "next_actions": [
    { "type": "confirmation", "label": "Order received", "status": "complete" }
  ]
}
```

## Cart Token

Send the cart token in either:

- `X-Frankies-Cart-Token`
- `cartToken` in the request payload

Create the first cart item with no token; the response will include `cartToken`.

## Product Setup

Use WooCommerce products as menu items and `product_cat` as menu categories.

Per product, configure:

- featured card flag
- badge (`featured` or `popular`)
- featured dark flag
- availability (`available` or `unavailable`)
- fulfillment mode
- spice levels JSON
- add-ons JSON
- native Woo upsells
- Woo short description for menu card copy
- Woo main description for item detail copy

Example spice levels JSON:

```json
[{"key":"mild","label":"Mild","price_adjustment":"0"},{"key":"medium-jalapeno","label":"Medium (Jalapeno)","price_adjustment":"0"},{"key":"hot","label":"Hot","price_adjustment":"0"}]
```

Example add-ons JSON:

```json
[{"key":"extras","label":"Add-ons","type":"checkbox","min":0,"max":4,"options":[{"key":"guac","label":"Guac","price_adjustment":"2.00"},{"key":"extra-bacon","label":"Extra Bacon","price_adjustment":"3.00"}]}]
```

Per category, configure:

- display order
- CTA label
- optional image override

## Admin Workflow

Create categories:

- Use WooCommerce product categories for top-level menu groups.
- Set category display order for sidebar/tab order.
- Add a category image or image override for cleaner menu/category payloads.
- Use the category edit screen fields added by this plugin:
  - `Display order`
  - `CTA label`
  - `Image URL override`

Create products:

- Use normal WooCommerce products.
- Set product image and gallery.
- Use Woo short description for default card copy.
- Use Woo main description for the detail body.
- Use `Menu sort order` to control within-category ordering.
- Use `Estimated prep minutes` when an item typically takes longer than the store default.
- Use the `Headless Menu Settings` section on the Woo product edit screen for:
  - `Feature in menu cards`
  - `Card description override`
  - `Badge`
  - `Fulfillment mode`
  - `Availability`
  - `Estimated prep minutes`
  - `Menu sort order`
  - `Spice levels JSON`
  - `Add-ons JSON`

Create add-ons:

- Add structured JSON in the `Add-ons JSON` field.
- Use `type`, `min`, and `max` to model checkbox/radio-like behavior.
- Add `price_adjustment` per option.

Create upsells:

- Use native WooCommerce upsells on the product edit screen.

Payment setup:

- Payment gateways are intentionally not wired into the headless checkout yet.
- Revisit card, UPI, COD, or wallet choices only after client consultation.
- Existing Woo gateway plugins can remain installed, but the current headless checkout flow does not expose them.

Delivery / pickup setup:

- Use the product `Fulfillment mode` field for item-level pickup/delivery eligibility.
- Configure WooCommerce shipping zones/methods for delivery.
- Pickup remains API-driven and does not require a traditional Woo checkout page.

Validation and operational notes:

- Product/category admin saves are nonce-protected and sanitized before persistence.
- Invalid JSON for spice levels or add-on groups is logged and surfaced back in Woo admin save notices.
- Missing product images and missing card descriptions are logged so incomplete menu data is easier to catch before publishing.
- Menu caches are purged and frontend revalidation is triggered when Woo menu products/categories change.

## Auth And Decoupled Frontend Notes

- Public menu/cart/checkout endpoints are intentionally guest-accessible for the headless storefront.
- The decoupled frontend should persist and send `X-Frankies-Cart-Token` on cart and checkout requests.
- Order confirmation reads require the Woo order key unless the current user can manage WooCommerce.
- For browser-based React apps, requests should still be sent over HTTPS and frontend origins should be controlled at the deployment layer.
- Guest storefront requests do not need a WordPress nonce.
- If the frontend is making authenticated admin-side requests from within a WordPress session, send `X-WP-Nonce` as usual for those admin-only requests. The storefront order flow itself should stay token-based, not cookie-auth based.

## Frontend API Contract Summary

Base namespaces:

- Public content and legacy commerce: `wp-json/frankies/v1`
- Current headless storefront API: `wp-json/frankies-headless/v1`

Menu endpoints:

- `GET /menu`
  - returns grouped categories with nested product cards for menu pages
- `GET /menu/categories`
  - returns sorted category tabs/sidebar items
- `GET /menu/items?category=&featured=&search=&availability=&limit=`
  - returns a filtered flat item collection
- `GET /menu/items/{id-or-slug}`
  - returns full item detail including spice options, add-on groups, and upsells
- `GET /menu/bootstrap?initial=&limit=`
  - returns first-load payload with brand/menu metadata, categories, featured items, initial items, and cart placeholder data

Cart endpoints:

- `GET /cart`
  - returns the current guest cart and, when needed, a `cart_token`
- `POST /cart/add`
  - body: `{ product_id, quantity, spice_level, addons }`
- `POST /cart/update`
  - body: `{ key, quantity }`
- `POST /cart/remove`
  - body: `{ key }`
- `POST /cart/clear`
  - empties the cart

Checkout endpoints:

- `GET /checkout/config`
  - returns enabled fulfillment modes, delivery methods, required fields, estimated times, and auth/integration notes
- `POST /checkout/validate`
  - validates cart plus customer/fulfillment payload before order creation
- `POST /checkout/place-order`
  - body: `{ fulfillment_type, full_name, mobile_number, delivery_method?, address }`
- `GET /orders/{id}/confirmation?key={orderKey}`
  - returns safe success-page payload for the order

Core response fields the React app can rely on:

- Menu item cards:
  - `id`, `slug`, `name`, `image`, `short_description`, `formatted_price`, `badge`, `availability`, `fulfillment_mode`
- Item detail:
  - `gallery`, `description`, `spice_options`, `addon_groups`, `upsell_products`, `estimated_prep_minutes`
- Cart:
  - `cart_token`, `items`, `item_count`, `subtotal`, `taxes`, `fees`, `total`, `currency`, `available_upsells`
- Checkout confirmation:
  - `order_id`, `order_number`, `payment_status`, `status`, `fulfillment_type`, `customer_phone`, `estimated_ready_time`, `total`, `item_summary`, `next_actions`
