// Google Sheets API Configuration
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQGoApwaigEpZfk9-1FKjA2spvqkFL7VjApXDE85J1hubbW6wRDeTQYR91v3C3mc0iWg/exec';

// Account Master Data
export const ACCOUNTS = {
  Living: ['Cash', 'BCA', 'Ovo', 'Dana', 'ShopeePay', 'Mandiri_eMoney'],
  Playing: ['Mandiri', 'Gopay', 'Flazz'],
  Saving: ['Blu', 'SeaBank'],
  Investment: ['Deposit', 'RDPU', 'Bond', 'Gold', 'Stock', 'Crypto']
};

// Category Master Data
export const CATEGORIES = {
  Income: ['Salary', 'Side Hustle', 'Other Income'],
  Expense: [
    'Daily Needs', 'Dating', 'Transport', 'Groceries', 
    'Health', 'Entertainment', 'Shopping', 'Education',
    'Gift', 'Subscription', 'Utility', 'Family',
    'Other Expense', 'Lifestyle', 'Social', 'Self Improvement',
    'Other Cost', 'Adjustment'
  ],
  Transfer: ['Transfer', 'Topup', 'Investment Buy']
};