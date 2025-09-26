const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const applicationController = require('../controllers/application.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

router.get('/',
  [
    query('status').optional().isIn([
      'DRAFT', 'SENT', 'IN_REVIEW', 'INTERVIEW_SCHEDULED',
      'INTERVIEWED', 'OFFER_RECEIVED', 'ACCEPTED', 'REJECTED',
      'WITHDRAWN', 'NO_RESPONSE'
    ]),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'applicationDate', 'position', 'status']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  applicationController.getApplications
);

router.get('/stats',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  applicationController.getApplicationStats
);

router.get('/:id',
  [
    param('id').notEmpty().withMessage('ID de candidature requis')
  ],
  applicationController.getApplication
);

router.post('/',
  [
    body('companyName').notEmpty().withMessage('Nom de l\\'entreprise requis'),
    body('position').notEmpty().withMessage('Poste requis'),
    body('type').optional().isIn(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'TEMPORARY', 'REMOTE', 'HYBRID']),
    body('status').optional().isIn([
      'DRAFT', 'SENT', 'IN_REVIEW', 'INTERVIEW_SCHEDULED',
      'INTERVIEWED', 'OFFER_RECEIVED', 'ACCEPTED', 'REJECTED',
      'WITHDRAWN', 'NO_RESPONSE'
    ]),
    body('applicationDate').optional().isISO8601(),
    body('companyWebsite').optional().isURL(),
    body('jobUrl').optional().isURL()
  ],
  applicationController.createApplication
);

router.put('/:id',
  [
    param('id').notEmpty().withMessage('ID de candidature requis'),
    body('type').optional().isIn(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'TEMPORARY', 'REMOTE', 'HYBRID']),
    body('status').optional().isIn([
      'DRAFT', 'SENT', 'IN_REVIEW', 'INTERVIEW_SCHEDULED',
      'INTERVIEWED', 'OFFER_RECEIVED', 'ACCEPTED', 'REJECTED',
      'WITHDRAWN', 'NO_RESPONSE'
    ]),
    body('applicationDate').optional().isISO8601(),
    body('jobUrl').optional().isURL()
  ],
  applicationController.updateApplication
);

router.delete('/:id',
  [
    param('id').notEmpty().withMessage('ID de candidature requis')
  ],
  applicationController.deleteApplication
);

module.exports = router;
