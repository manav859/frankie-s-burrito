<?php
/**
 * Minimal fallback page for the headless WordPress install.
 *
 * @package Frankies_Headless
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
	<main style="max-width: 760px; margin: 80px auto; padding: 0 24px; font-family: sans-serif;">
		<h1><?php bloginfo( 'name' ); ?></h1>
		<p>This WordPress install is running in headless mode.</p>
		<p>Use the React frontend for the public site and the REST API for content delivery.</p>
		<p><a href="<?php echo esc_url( rest_url( 'frankies/v1/bootstrap' ) ); ?>">View bootstrap API</a></p>
		<?php if ( current_user_can( 'manage_options' ) ) : ?>
			<p><a href="<?php echo esc_url( admin_url( 'admin.php?page=frankies-headless' ) ); ?>">Open headless settings</a></p>
		<?php endif; ?>
	</main>
	<?php wp_footer(); ?>
</body>
</html>
