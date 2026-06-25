class User {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String phone;
  final String role;
  final bool isActive;
  final bool isDeleted;
  final bool isArchived;
  final bool emailVerified;
  final DateTime createdAt;
  final DateTime updatedAt;

  const User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.phone = '',
    required this.role,
    required this.isActive,
    required this.isDeleted,
    required this.isArchived,
    this.emailVerified = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      phone: json['phone']?.toString() ?? '',
      role: json['role'] ?? '',
      isActive: json['isActive'] ?? true,
      isDeleted: json['isDeleted'] ?? false,
      isArchived: json['isArchived'] ?? false,
      emailVerified: json['emailVerified'] ?? true,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'phone': phone,
      'role': role,
      'isActive': isActive,
      'isDeleted': isDeleted,
      'isArchived': isArchived,
      'emailVerified': emailVerified,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
