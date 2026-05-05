'use strict';

const { Server } = require('socket.io');
const env = require('../config/env');
const eventBus = require('./eventBus');
const { CHANNELS } = require('./eventBus');

let io;

function init(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [env.origins.wepayCash, env.origins.gemAgency],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log('[SOCKET] Client connected:', socket.id);

    socket.on('join:dashboard', () => {
      socket.join('dashboard');
      socket.emit('connected', { status: 'ok', timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', () => {
      console.log('[SOCKET] Client disconnected:', socket.id);
    });
  });

  // Bridge Redis events to Socket.IO rooms
  eventBus.subscribe(CHANNELS.AGENT_RESULT, (payload) => {
    io.to('dashboard').emit('agent:result', payload);
  });

  eventBus.subscribe(CHANNELS.LEAD_CREATED, (payload) => {
    io.to('dashboard').emit('lead:created', payload);
  });

  eventBus.subscribe(CHANNELS.LEAD_UPDATED, (payload) => {
    io.to('dashboard').emit('lead:updated', payload);
  });

  eventBus.subscribe(CHANNELS.PAYMENT_EVENT, (payload) => {
    io.to('dashboard').emit('payment:event', payload);
  });

  eventBus.subscribe(CHANNELS.SYSTEM_ALERT, (payload) => {
    io.to('dashboard').emit('system:alert', payload);
  });

  console.log('[SOCKET] Socket.IO command centre initialised');
  return io;
}

function emit(event, payload) {
  if (!io) throw new Error('Socket.IO not initialised');
  io.to('dashboard').emit(event, payload);
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}

module.exports = { init, emit, getIO };
