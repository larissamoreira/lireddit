import "reflect-metadata";
import { MyContext } from './types';
import { __prod__ } from './constants';
import { PostResolver } from './resolvers/post';
import { HelloResolver } from './resolvers/hello';
import { MikroORM } from '@mikro-orm/core';
import microConfig from './mikro-orm.config';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { UserResolver } from "./resolvers/user";
import redis from 'redis';
import connectRedis from 'connect-redis';
import session from "express-session";

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();

  const app = express();

  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient();
  
  app.use(
    session({
      name: 'qid',
      store: new RedisStore({
        client: redisClient,
        disableTouch: true
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 20, // 10 years
        httpOnly: true,
        sameSite: 'lax', //csrf
        secure: !__prod__ // cookie only works in https
      },
      saveUninitialized: false,
      secret: 'ahuehuahwe',
      resave: false,
    })
  )

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({ em: orm.em, req, res })
  });

  apolloServer.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log('server started on localhost:4000');
  });
};

main().catch((err) => {
  console.log(err);
});