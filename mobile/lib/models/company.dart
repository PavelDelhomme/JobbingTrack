import 'user.dart';

class Company {
  final String id;
  final String name;
  final String website;
  final String industry;
  final String size;
  final String location;
  final String description;
  final String logo;
  final bool isActive;
  final bool isDeleted;
  final User createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Company({
    required this.id,
    required this.name,
    required this.website,
    required this.industry,
    required this.size,
    required this.location,
    required this.description,
    required this.logo,
    required this.isActive,
    required this.isDeleted,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Company.fromJson(Map<String, dynamic> json) {
    return Company(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      website: json['website'] ?? '',
      industry: json['industry'] ?? '',
      size: json['size'] ?? '',
      location: json['location'] ?? '',
      description: json['description'] ?? '',
      logo: json['logo'] ?? '',
      isActive: json['isActive'] ?? true,
      isDeleted: json['isDeleted'] ?? false,
      createdBy: json['createdBy'] != null ? User.fromJson(json['createdBy'] as Map<String, dynamic>) : User.fromJson({}),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'website': website,
      'industry': industry,
      'size': size,
      'location': location,
      'description': description,
      'logo': logo,
      'isActive': isActive,
      'isDeleted': isDeleted,
      'createdBy': createdBy.toJson(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

