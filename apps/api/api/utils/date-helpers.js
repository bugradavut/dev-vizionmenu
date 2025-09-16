/**
 * Date Utilities for Analytics
 * Professional date handling functions for consistent data processing
 */

/**
 * Fill missing dates in analytics data with zero values
 * Ensures consistent date ranges for frontend chart display
 * @param {Array} data - Array of data points with date property
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {Object} defaultValues - Default values for missing dates
 * @returns {Array} Complete date range with filled missing dates
 */
function fillMissingDates(data, startDate, endDate, defaultValues = {}) {
  const filledData = [];
  const dataMap = new Map();

  // Create map of existing data by date
  data.forEach(item => {
    dataMap.set(item.date, item);
  });

  // Generate all dates in range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];

    if (dataMap.has(dateStr)) {
      filledData.push(dataMap.get(dateStr));
    } else {
      filledData.push({
        date: dateStr,
        ...defaultValues
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return filledData;
}

/**
 * Get date range for a given period
 * @param {string} period - Period (7d, 30d, 90d, custom)
 * @param {string} startDate - Custom start date
 * @param {string} endDate - Custom end date
 * @returns {Object} Date range with start and end dates
 */
function getDateRange(period, startDate = null, endDate = null) {
  const now = new Date();
  let start, end;

  if (period === 'custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (period) {
      case '7d':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start = new Date(now);
        start.setDate(now.getDate() - 90);
        break;
      default:
        start = new Date(now);
        start.setDate(now.getDate() - 7);
    }
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}

/**
 * Format date for display in charts
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} locale - Locale for formatting (en-CA, fr-CA)
 * @returns {string} Formatted date string
 */
function formatDateForDisplay(dateStr, locale = 'en-CA') {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Validate date string format
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid YYYY-MM-DD format
 */
function isValidDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

module.exports = {
  fillMissingDates,
  getDateRange,
  formatDateForDisplay,
  isValidDateString
};