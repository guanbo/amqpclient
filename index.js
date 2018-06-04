'use strict';

const amqp = require('amqplib');
class AMQPClient {
  constructor(options, interval) {
    if (typeof options === 'string') {
      options = { hostname: options };
    }
    this.options = Object.assign({
      protocol: 'amqp',
      hostname: 'localhost',
      port: 5672,
      username: 'guest',
      password: 'guest',
      locale: 'en_US',
      frameMax: 0,
      heartbeat: 0,
      vhost: '/',
    }, options || {});
    this.interval = interval || 10000;
  }

  start(worker) {
    if (worker) this.worker = worker;
    return amqp.connect(this.options).then(conn => {
      this.conn = conn;
      console.log('[AMQP] connected');
      process.once('SIGINT', conn.close.bind(conn));
      conn.on('error', (err) => {
        console.log('[AMQP] connection error\n', err.message);
        this.reconnect();
      });
      conn.on('close', (err) => {
        console.log('[AMQP] connection close\n', err.message);
        if (err.code === 320) {
          this.reconnect();
        }
      });
      console.log('[AMQP] createChannel');
      return conn.createChannel().then(this.worker);
    }, err => {
      console.log('[AMQP] connect error\n', err);
      this.reconnect();
    });
  }

  reconnect() {
    console.log('[AMQP] reconnect:' + this.options.hostname);
    setTimeout(() => {
      this.start();
    }, this.interval);
  }

  close() {
    if (this.conn) this.conn.close();
  }
}

module.exports = AMQPClient;