import React from 'react';

import API, { graphqlOperation } from '@aws-amplify/api';
import PubSub from '@aws-amplify/pubsub';

import { createTodo } from './graphql/mutations';

import awsconfig from './aws-exports';
import './App.css';

API.configure(awsconfig);
PubSub.configure(awsconfig);

async function createNewTodo() {
    const todo = { name: "Use AWS AppSync", description: "Realtime and offline" };
    await API.graphql(graphqlOperation(createTodo, { input: todo }));
}

function App() {
  return (
    <div className="App">
      <button onClick={createNewTodo}>Add Todo</button>
    </div>
  );
}

export default App;
