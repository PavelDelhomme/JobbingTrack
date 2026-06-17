import 'package:flutter_test/flutter_test.dart';
import 'package:jobbingtrack_mobile/models/user.dart';
import 'package:jobbingtrack_mobile/utils/admin_access.dart';

User _user({required String role, String email = 'admin@example.invalid'}) {
  return User(
    id: '1',
    email: email,
    firstName: 'A',
    lastName: 'B',
    role: role,
    isActive: true,
    isDeleted: false,
    isArchived: false,
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
  );
}

void main() {
  test('AdminAccess refuse USER', () {
    expect(AdminAccess.canAccessAdmin(_user(role: 'USER')), isFalse);
  });

  test('AdminAccess accepte ADMIN', () {
    expect(AdminAccess.canAccessAdmin(_user(role: 'ADMIN')), isTrue);
  });

  test('AdminAccess accepte SUPER_ADMIN', () {
    expect(AdminAccess.canAccessAdmin(_user(role: 'SUPER_ADMIN')), isTrue);
  });
}
