// Tests de base du contrôleur d'authentification
const authController = require('../../src/controllers/auth.controller');

describe('Auth Controller', () => {
  test('should export register function', () => {
    expect(typeof authController.register).toBe('function');
  });

  test('should export login function', () => {
    expect(typeof authController.login).toBe('function');
  });

  test('should export logout function', () => {
    expect(typeof authController.logout).toBe('function');
  });

  test('should export refreshToken function', () => {
    expect(typeof authController.refreshToken).toBe('function');
  });

  test('should export getProfile function', () => {
    expect(typeof authController.getProfile).toBe('function');
  });

  test('should export forgotPassword function', () => {
    expect(typeof authController.forgotPassword).toBe('function');
  });

  test('should export resetPassword function', () => {
    expect(typeof authController.resetPassword).toBe('function');
  });

  test('should export getAllUsers function', () => {
    expect(typeof authController.getAllUsers).toBe('function');
  });

  test('should export updateUserRole function', () => {
    expect(typeof authController.updateUserRole).toBe('function');
  });

  test('should export toggleUserStatus function', () => {
    expect(typeof authController.toggleUserStatus).toBe('function');
  });

  test('should export deleteUser function', () => {
    expect(typeof authController.deleteUser).toBe('function');
  });

  test('should export verifyResetToken function', () => {
    expect(typeof authController.verifyResetToken).toBe('function');
  });

  test('should export getUserCustomization function', () => {
    expect(typeof authController.getUserCustomization).toBe('function');
  });

  test('should export saveUserCustomization function', () => {
    expect(typeof authController.saveUserCustomization).toBe('function');
  });
});
