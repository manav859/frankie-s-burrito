import {
	__experimentalDivider as Divider,
	__experimentalHeading as Heading,
	__experimentalSpacer as Spacer,
	Button,
	Notice,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Link } from 'components/wc';
import { createInterpolateElement } from '@wordpress/element';
import { withBoundary } from 'components/HOC';
import { LABEL_PURCHASE_STATUS } from 'data/constants';
import { Label } from 'types';
import { settingsPageUrl } from '../constants';
import { useLabelPurchaseContext } from 'context/label-purchase';
import { getChangePaymentMethodUrl } from 'components/shipping-settings/constants';

interface PurchaseErrorNoticeProps {
	label?: Label;
}

export const PurchaseErrorNotice = withBoundary(
	( { label }: PurchaseErrorNoticeProps ) => {
		const {
			labels: { labelStatusUpdateErrors },
			account: { getSubscriptionId },
			nextDesign,
		} = useLabelPurchaseContext();
		if (
			! label ||
			labelStatusUpdateErrors.length < 1 ||
			label?.status !== LABEL_PURCHASE_STATUS.PURCHASE_ERROR
		) {
			return null;
		}

		const changePaymentMethodUrl = getChangePaymentMethodUrl(
			getSubscriptionId()
		);

		const handleClick = () => {
			window.open(
				changePaymentMethodUrl,
				'_blank',
				'noopener,noreferrer'
			);
		};

		return (
			<>
				<Heading level={ 3 }>
					{ __(
						'An error occurred while purchasing the label',
						'woocommerce-shipping'
					) }
				</Heading>
				<Spacer margin="7" />
				<Notice status="error" isDismissible={ false }>
					{ labelStatusUpdateErrors.map( ( error, index ) => (
						<p key={ index }>{ error }</p>
					) ) }

					<Spacer margin="3" />

					{ nextDesign ? (
						<>
							<p>
								{ __(
									'The shipping label couldn’t be purchased due to a payment issue. Update your payment settings to try again.',
									'woocommerce-shipping'
								) }
							</p>
							<Button variant="primary" onClick={ handleClick }>
								{ __(
									'Manage payment methods',
									'woocommerce-shipping'
								) }
							</Button>
						</>
					) : (
						<p>
							{ createInterpolateElement(
								__(
									'Click <a>here</a> and visit settings to update your payment settings and try again.',
									'woocommerce-shipping'
								),
								{
									a: (
										<Link
											href={ settingsPageUrl }
											type="wp-admin"
											target="_blank"
											title={ __(
												'Open WooCommerce Shipping settings',
												'woocommerce-shipping'
											) }
										>
											{ __(
												'here',
												'woocommerce-shipping'
											) }
										</Link>
									),
								}
							) }
						</p>
					) }
				</Notice>
				<Divider margin="12" />
			</>
		);
	}
)( 'PurchaseErrorNotice' );
