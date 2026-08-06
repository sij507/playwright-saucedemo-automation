const PASSWORD = 'secret_sauce';

const users = {
  standard: { username: 'standard_user', password: PASSWORD },
  lockedOut: { username: 'locked_out_user', password: PASSWORD },
  problem: { username: 'problem_user', password: PASSWORD },
  performanceGlitch: { username: 'performance_glitch_user', password: PASSWORD },
  error: { username: 'error_user', password: PASSWORD },
  visual: { username: 'visual_user', password: PASSWORD },
};

const invalidCredentials = {
  username: 'invalid_user',
  password: 'wrong_password',
};

const longString = 'a'.repeat(1000);
const specialCharacters = `!@#$%^&*()_+-=[]{}|;':",./<>?\`~`;

const errorMessages = {
  invalidCredentials: 'Epic sadface: Username and password do not match any user in this service',
  lockedOut: 'Epic sadface: Sorry, this user has been locked out.',
  usernameRequired: 'Epic sadface: Username is required',
  passwordRequired: 'Epic sadface: Password is required',
  firstNameRequired: 'Error: First Name is required',
  lastNameRequired: 'Error: Last Name is required',
  postalCodeRequired: 'Error: Postal Code is required',
  loginRequiredForInventory: "Epic sadface: You can only access '/inventory.html' when you are logged in.",
};

const sortOptions = {
  nameAsc: { value: 'az', label: 'Name (A to Z)' },
  nameDesc: { value: 'za', label: 'Name (Z to A)' },
  priceAsc: { value: 'lohi', label: 'Price (low to high)' },
  priceDesc: { value: 'hilo', label: 'Price (high to low)' },
};

const validCheckoutInfo = {
  firstName: 'John',
  lastName: 'Doe',
  postalCode: '12345',
};

const checkoutConfirmationMessage = 'Thank you for your order!';

module.exports = {
  users,
  invalidCredentials,
  longString,
  specialCharacters,
  errorMessages,
  sortOptions,
  validCheckoutInfo,
  checkoutConfirmationMessage,
};
