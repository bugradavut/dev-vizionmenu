// =====================================================
// EMAIL LAYOUT COMPONENT
// Reusable email wrapper with VizionMenu branding
// =====================================================

const React = require('react');
const {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
} = require('@react-email/components');

/**
 * Email Layout Component
 * Provides consistent branding and structure for all transactional emails
 */
function EmailLayout({ children, preview }) {
  return React.createElement(
    Html,
    { lang: 'en' },
    React.createElement(
      Head,
      null,
      React.createElement('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' })
    ),
    preview && React.createElement('meta', { name: 'preview', content: preview }),
    React.createElement(
      Body,
      { style: styles.body },
      React.createElement(
        Container,
        { style: styles.container },
        React.createElement(
          Section,
          { style: styles.header },
          React.createElement(
            Text,
            { style: styles.logo },
            '🍽️ VizionMenu'
          )
        ),
        React.createElement(
          Section,
          { style: styles.content },
          children
        ),
        React.createElement(Hr, { style: styles.hr }),
        React.createElement(
          Section,
          { style: styles.footer },
          React.createElement(
            Text,
            { style: styles.footerText },
            'VizionMenu - Restaurant Management Platform'
          ),
          React.createElement(
            Text,
            { style: styles.footerSubtext },
            'This is an automated message. Please do not reply to this email.'
          )
        )
      )
    )
  );
}

const styles = {
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '40px auto',
    padding: '0',
    maxWidth: '600px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: '24px',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
  },
  logo: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0',
    textAlign: 'center',
  },
  content: {
    padding: '32px 24px',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '0',
  },
  footer: {
    padding: '24px',
    textAlign: 'center',
  },
  footerText: {
    color: '#6b7280',
    fontSize: '14px',
    margin: '0 0 8px 0',
  },
  footerSubtext: {
    color: '#9ca3af',
    fontSize: '12px',
    margin: '0',
  },
};

module.exports = EmailLayout;
