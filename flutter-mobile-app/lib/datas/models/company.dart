class Company {
  final String id;
  final String name;
  final String description;
  final String website;
  final String industry;
  final String size;
  final String location;

  const Company({
    required this.id,
    required this.name,
    this.description = '',
    this.website = '',
    this.industry = '',
    this.size = '',
    this.location = '',
  });

  factory Company.fromJson(Map<String, dynamic> json) {
    return Company(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      website: json['website'] ?? '',
      industry: json['industry'] ?? '',
      size: json['size'] ?? '',
      location: json['location'] ?? '',
    );
  }
}
