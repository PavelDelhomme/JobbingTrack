export const testUsers = {
  admin: {
    email: 'admin@example.com',
    password: 'password123',
    firstName: 'Admin',
    lastName: 'Test',
    role: 'ADMIN'
  },
  user: {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER'
  }
}

export const testCompanies = {
  techCorp: {
    name: 'TechCorp',
    industry: 'Technologie',
    size: '50-200',
    website: 'https://techcorp.example.com',
    location: 'Paris, France'
  },
  dataSoft: {
    name: 'DataSoft',
    industry: 'Logiciels',
    size: '200-500',
    website: 'https://datasoft.example.com',
    location: 'Lyon, France'
  }
}

export const testApplications = {
  frontendDev: {
    position: 'Développeur Frontend',
    companyId: 'test-company-1',
    status: 'APPLIED',
    notes: 'Candidature spontanée'
  },
  dataScientist: {
    position: 'Data Scientist',
    companyId: 'test-company-2',
    status: 'INTERVIEW',
    notes: 'Entretien programmé'
  }
}

export const formData = {
  newApplication: {
    position: 'Ingénieur Backend',
    companyName: 'StartupTech',
    status: 'DRAFT',
    notes: 'Nouvelle candidature à créer'
  },
  editProfile: {
    firstName: 'Updated',
    lastName: 'Name',
    email: 'updated@example.com'
  }
}
