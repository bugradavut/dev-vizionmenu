// =====================================================
// ORDER RECEIVED EMAIL TEMPLATE
// Sent immediately when customer places an order
// =====================================================

const React = require('react');
const { Text, Section, Row, Column } = require('@react-email/components');
const EmailLayout = require('../components/EmailLayout');

/**
 * Order Received Email Template
 * @param {Object} props
 * @param {string} props.customerName - Customer's name
 * @param {string} props.orderNumber - Short order number (ORDER-XXXXX)
 * @param {number} props.totalAmount - Order total in dollars
 * @param {Array} props.items - Order items
 * @param {string} props.orderType - 'delivery' | 'pickup' | 'dine-in'
 * @param {string} props.estimatedTime - Estimated ready time
 * @param {boolean} props.isPreOrder - Whether this is a pre-order
 * @param {string} props.scheduledDateTime - Pre-order scheduled date/time
 * @param {string} props.branchName - Restaurant branch name
 * @param {string} props.branchPhone - Restaurant phone number
 */
function OrderReceived(props) {
  const {
    customerName = 'Valued Customer',
    orderNumber = 'ORDER-XXXXX',
    totalAmount = 0,
    items = [],
    orderType = 'pickup',
    estimatedTime = '20-30 minutes',
    isPreOrder = false,
    scheduledDateTime = null,
    branchName = 'VizionMenu Restaurant',
    branchPhone = '(555) 123-4567',
  } = props;

  return React.createElement(
    EmailLayout,
    { preview: `Order ${orderNumber} - Thank you for your order!` },

    // Title
    React.createElement(
      Text,
      { style: styles.title },
      '✅ Order Received!'
    ),

    // Greeting
    React.createElement(
      Text,
      { style: styles.greeting },
      `Hi ${customerName},`
    ),

    // Main message
    React.createElement(
      Text,
      { style: styles.text },
      isPreOrder
        ? `Thank you for your pre-order! We've received your order and it will be prepared for ${scheduledDateTime}.`
        : 'Thank you for your order! We've received it and our kitchen is getting started.'
    ),

    // Order details box
    React.createElement(
      Section,
      { style: styles.orderBox },

      React.createElement(
        Text,
        { style: styles.orderBoxTitle },
        'Order Details'
      ),

      React.createElement(
        Row,
        null,
        React.createElement(
          Column,
          null,
          React.createElement(
            Text,
            { style: styles.label },
            'Order Number:'
          )
        ),
        React.createElement(
          Column,
          { align: 'right' },
          React.createElement(
            Text,
            { style: styles.value },
            orderNumber
          )
        )
      ),

      React.createElement(
        Row,
        null,
        React.createElement(
          Column,
          null,
          React.createElement(
            Text,
            { style: styles.label },
            'Order Type:'
          )
        ),
        React.createElement(
          Column,
          { align: 'right' },
          React.createElement(
            Text,
            { style: styles.value },
            orderType.charAt(0).toUpperCase() + orderType.slice(1)
          )
        )
      ),

      React.createElement(
        Row,
        null,
        React.createElement(
          Column,
          null,
          React.createElement(
            Text,
            { style: styles.label },
            isPreOrder ? 'Scheduled For:' : 'Estimated Time:'
          )
        ),
        React.createElement(
          Column,
          { align: 'right' },
          React.createElement(
            Text,
            { style: styles.value },
            isPreOrder ? scheduledDateTime : estimatedTime
          )
        )
      ),

      React.createElement(
        Row,
        null,
        React.createElement(
          Column,
          null,
          React.createElement(
            Text,
            { style: styles.label },
            'Total Amount:'
          )
        ),
        React.createElement(
          Column,
          { align: 'right' },
          React.createElement(
            Text,
            { style: styles.totalAmount },
            `$${totalAmount.toFixed(2)}`
          )
        )
      )
    ),

    // Items list
    items.length > 0 && React.createElement(
      Section,
      { style: styles.itemsSection },
      React.createElement(
        Text,
        { style: styles.itemsTitle },
        'Your Items:'
      ),
      ...items.map((item, index) =>
        React.createElement(
          Row,
          { key: index, style: styles.itemRow },
          React.createElement(
            Column,
            { style: { width: '60%' } },
            React.createElement(
              Text,
              { style: styles.itemName },
              `${item.quantity}x ${item.name}`
            )
          ),
          React.createElement(
            Column,
            { style: { width: '40%' }, align: 'right' },
            React.createElement(
              Text,
              { style: styles.itemPrice },
              `$${(item.price * item.quantity).toFixed(2)}`
            )
          )
        )
      )
    ),

    // Next steps
    React.createElement(
      Section,
      { style: styles.nextStepsBox },
      React.createElement(
        Text,
        { style: styles.nextStepsTitle },
        'What happens next?'
      ),
      React.createElement(
        Text,
        { style: styles.nextStepsText },
        isPreOrder
          ? `We'll send you another email when we start preparing your order (approximately 15 minutes before your scheduled time).`
          : orderType === 'delivery'
            ? `We'll notify you when your order is ready and handed to the courier. You'll receive tracking information to follow your delivery.`
            : `We'll notify you when your order is ready for pickup. Please bring your order number: ${orderNumber}`
      )
    ),

    // Contact info
    React.createElement(
      Text,
      { style: styles.contactText },
      `Questions? Contact ${branchName} at `,
      React.createElement(
        'a',
        { href: `tel:${branchPhone}`, style: styles.link },
        branchPhone
      )
    )
  );
}

const styles = {
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: '0',
    marginBottom: '16px',
  },
  greeting: {
    fontSize: '18px',
    color: '#374151',
    marginBottom: '16px',
  },
  text: {
    fontSize: '16px',
    color: '#4b5563',
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  orderBox: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  orderBoxTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: '0',
    marginBottom: '16px',
  },
  label: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '8px 0',
  },
  value: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '500',
    margin: '8px 0',
  },
  totalAmount: {
    fontSize: '18px',
    color: '#2563eb',
    fontWeight: 'bold',
    margin: '8px 0',
  },
  itemsSection: {
    marginBottom: '24px',
  },
  itemsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '12px',
  },
  itemRow: {
    marginBottom: '8px',
  },
  itemName: {
    fontSize: '14px',
    color: '#4b5563',
    margin: '4px 0',
  },
  itemPrice: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0',
  },
  nextStepsBox: {
    backgroundColor: '#eff6ff',
    padding: '16px',
    borderRadius: '8px',
    borderLeft: '4px solid #2563eb',
    marginBottom: '24px',
  },
  nextStepsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1e40af',
    marginTop: '0',
    marginBottom: '8px',
  },
  nextStepsText: {
    fontSize: '14px',
    color: '#1e40af',
    lineHeight: '1.6',
    margin: '0',
  },
  contactText: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: '24px',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
  },
};

module.exports = OrderReceived;
