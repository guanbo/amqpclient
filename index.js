'use strict';

const amqp = require('amqplib');
class AMQPClient {
  constructor(options, interval, rpcOptions) {
    if (typeof options === 'string') {
      options = { hostname: options };
    }
    this.options = Object.assign({
      protocol: 'amqp',
      hostname: process.env.RABBITMQ_HOST || 'localhost',
      port: process.env.RABBITMQ_PORT || 5672,
      username: process.env.RABBITMQ_USER ||'guest',
      password: process.env.RABBITMQ_PWD || 'guest',
      locale: 'en_US',
      frameMax: 0,
      heartbeat: 0,
      vhost: process.env.RABBITMQ_VHOST || '/',
    }, options || {});
    this.interval = interval || 10000;
    this.rpcOptions = Object.assign({
      queue: 'amqpclient.rpc.request',
    }, rpcOptions||{enable: false});
  }

  connect() {
    if (this.conn) return Promise.resolve(this.conn);
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
      return conn;
    }, err => {
      console.log('[AMQP] connect error\n', err);
      this.reconnect();
      return err;
    });
  }

  reconnect() {
    this.conn = null;
    console.log('[AMQP] reconnect:' + this.options.hostname);
    setTimeout(async () => {
      await this.start();
      await this.rpcService();
    }, this.interval);
  }

  start(worker) {
    if (worker) this.worker = worker;
    if (!this.worker) return Promise.resolve();
    return this.connect().then(conn => {
      console.log('[AMQP] createChannel for worker');
      return conn.createChannel().then(this.worker);
    }, err => {
      return err;
    });
  }

  /**
   * @param  {function} srv must return Promise Object;
   * @param  {object} rpcOptions optional
   */
  rpcService(srv, rpcOptions) {
    if (srv) this.rpcSrv = srv;
    if (rpcOptions) this.rpcOptions = Object.assign(this.rpcOptions, rpcOptions);
    if (!this.rpcSrv) return Promise.resolve();
    return this.connect().then(conn=>{
      console.log('[AMQP] createChannel for RPC');
      return conn.createChannel()
        .then(ch=>{
          const q = this.rpcOptions.queue;
          ch.assertQueue(q, {durable: false});
          ch.prefetch(1);
          console.log(' === Awaiting RPC requests on queue:', q);
          return ch.consume(q, async (msg) => {
            const res = await this.rpcSrv.call(this, JSON.parse(msg.content.toString()));
            ch.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(res)), {correlationId: msg.properties.correlationId});
            ch.ack(msg);
          });
        }, err=>{
          console.log("RPC Service error:", err);
          return err;
        });
    }, err => {
      return err;
    });
  }

  rpc(opts, rpcOptions) {
    let ch;
    if (rpcOptions) this.rpcOptions = Object.assign(this.rpcOptions, rpcOptions);
    return this.connect().then(conn=>{
      return conn.createChannel()
        .then(channel=>{
          ch = channel;
          return ch.assertQueue('', {exclusive: true});
        })
        .then(q=>{
          const corr = this.generateUuid();
          return new Promise((resolve, reject)=>{
            ch.consume(q.queue, (msg)=>{
              if (msg.properties.correlationId == corr) {
                resolve(JSON.parse(msg.content.toString()));
                ch.close();
              } else {
                console.log('correlationId expect:', corr, 'but got:', msg.properties.correlationId);
              }
            },  {noAck: true});
            ch.sendToQueue(this.rpcOptions.queue, Buffer.from(JSON.stringify(opts)), { correlationId: corr, replyTo: q.queue })    
          });
        })
        .catch(err=>{
          console.log('RPC call error:', err);
          return err;
        });
    });
  }

  generateUuid() {
    return Math.random().toString() +
           Math.random().toString() +
           Math.random().toString();
  }

  close() {
    if (this.conn) this.conn.close();
    this.conn = null;
  }
}

module.exports = AMQPClient;