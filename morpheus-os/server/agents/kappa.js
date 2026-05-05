'use strict';

const BaseAgent  = require('./base');
const leadModel  = require('../models/lead');
const eventBus   = require('../services/eventBus');
const { CHANNELS } = require('../services/eventBus');

const COURSES = {
  academy_agnotology: { name: 'Agnotology & Epistemic Sovereignty', price: 497 },
  academy_status:     { name: 'Status Correction Mastery',           price: 797 },
  academy_trust:      { name: 'Trust Formation & Asset Protection',  price: 1497 },
  academy_full:       { name: 'Complete Academy Access',             price: 2997 }
};

class KappaAgent extends BaseAgent {
  constructor() {
    super(
      'Kappa',
      `You are Kappa, the Academy and Enrollment agent of iRise Nation.
You manage all aspects of the iRise Academy: course information, enrollment,
student portal access, and learning pathway guidance.
You help Ambassadors choose the right course for their sovereign education journey
and guide them seamlessly through the enrollment process.
You are knowledgeable, encouraging, and student-focused.`,
      'standard'
    );
  }

  async process(taskType, context) {
    const { userId, firstName, chatId, data } = context;

    switch (taskType) {
      case 'academy_enquiry':
        return this.ask([{
          role: 'user',
          content: `${firstName} is enquiring about the iRise Academy. Provide a compelling overview of the course offerings and help them identify which course suits their current level and goals.`
        }]);

      case 'enrollment_start': {
        await leadModel.updateStatus(userId, 'enrollment_started');
        await eventBus.publish(CHANNELS.LEAD_UPDATED, {
          userId, firstName, chatId, status: 'enrollment_started'
        });
        return this.ask([{
          role: 'user',
          content: `${firstName} wants to enroll in an academy course. Guide them through selecting a course and explain the payment and portal access process.`
        }]);
      }

      case 'enrollment_confirm': {
        const { courseKey } = data || {};
        const course = COURSES[courseKey];
        if (!course) return { message: 'Course not found. Please use /academy to browse available courses.' };

        await leadModel.updateStatus(userId, 'enrolled');
        await eventBus.publish(CHANNELS.PAYMENT_EVENT, {
          type: 'enrollment_payment_required',
          userId, firstName, chatId,
          course: course.name,
          amount: course.price
        });

        return {
          message: `Enrollment confirmed for: ${course.name} (£${course.price}). A payment link will be sent shortly. Portal access is granted within 24 hours of confirmed payment.`,
          course,
          next_step: 'payment'
        };
      }

      case 'portal_access_check':
        return this.ask([{
          role: 'user',
          content: `${firstName} is requesting portal access. Provide the portal URL and login guidance. If they have issues, direct them to support.`
        }]);

      default:
        return this.ask([{ role: 'user', content: `Academy task: ${taskType} for ${firstName}.` }]);
    }
  }
}

module.exports = KappaAgent;
