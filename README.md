# AMQP Client

An AMQP Client of Node.js base on amqplib with auto reconnect

## Quick Start

### Consumer 

```js
const AMQPClient = require('amqp.node.client');
const consumer = new AMQPClient({}, 1000);

const q = 'amqpclient.test';

consumer.start((ch) => {
  return ch.assertQueue(q).then(ok => {
    return ch.consume(q, (msg) => {
      msg.should.be.Object();
      if (msg) {
        let body = msg.content.toString();
        console.log(body);
        ch.ack(msg);
      }
    });
  });
});
```

### Disconnect

```shell
$ rabbitmqctl close_all_connections test_reconnect_case
```

### Producer 

```js
const AMQPClient = require('amqp.node.client');
const consumer = new AMQPClient();

const q = 'amqpclient.test';
const message = 'test message';

producer.start(ch => {
  ch.assertQueue(q).then(ok => {
    ch.sendToQueue(q, Buffer.from(message));
  });
});
```

## RPC

### Server

```js
/**
 * @name rpcServer
 * @param  {function} srv must return Promise Object;
 * @param  {object} rpcOptions optional
 */
rpcServer.rpcService(opts=>{
  const res = parseInt(opts.a)+parseInt(opts.b);
  return Promise.resolve({val: res});
}, {queue: 'my.custom.rpc.request.queue.name'}).then(res=>{
  console.log('rpc server ready');
});
```

### Client

```js
rpcClient.rpc({a:1, b:2}, {queue: q}).then(res=>{
  res.val.should.be.equal(3);
});
```

## Environment
- `RABBITMQ_HOST`   default host if set
- `RABBITMQ_VHOST`  default vhost if set
- `RABBITMQ_USER`   default username if set
- `RABBITMQ_PWD`    default password if set
- `RABBITMQ_PORT`   default port if set
