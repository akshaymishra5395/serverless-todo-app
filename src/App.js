import React, {useEffect, useReducer, useState} from 'react';

import API, { graphqlOperation } from '@aws-amplify/api';
import Auth from '@aws-amplify/auth';
import PubSub from '@aws-amplify/pubsub';

import { withAuthenticator } from 'aws-amplify-react';

import { createTodo } from './graphql/mutations';
import { listTodos } from './graphql/queries';
import { onCreateTodo } from './graphql/subscriptions';

import awsconfig from './aws-exports';
import './App.css';

API.configure(awsconfig);
Auth.configure(awsconfig);
PubSub.configure(awsconfig);

// Action Types
const QUERY = 'QUERY';
const SUBSCRIPTION = 'SUBSCRIPTION';

const initialState = {
    todos: [],
};

const reducer = (state, action) => {
    switch (action.type) {
        case QUERY:
            return {...state, todos: action.todos};
        case SUBSCRIPTION:
            return {...state, todos:[...state.todos, action.todo]};
        default:
            return state;
    }
};

async function createNewTodo(text) {
    const todo = { text: text };
    await API.graphql(graphqlOperation(createTodo, { input: todo }));
}

const Todo = ({ text }) => <div className="todo">{text}</div>;

function TodoForm({ addTodo }) {
  const [text, setText] = useState("");

  const handleSubmit = e => {
    e.preventDefault();
    if (!text) return;
    addTodo(text);
    setText("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        className="inputTodoText"
        value={text}
        onChange={e => setText(e.target.value)}
      />
    </form>
  );
}

function App() {
    const [state, dispatch] = useReducer(reducer, initialState);

    async function getData() {
        const todoData = await API.graphql(graphqlOperation(listTodos));
        dispatch({ type: QUERY, todos: todoData.data.listTodos.items });
    }

    useEffect((todos) => {
        getData();

        const subscription = API.graphql(graphqlOperation(onCreateTodo)).subscribe({
            next: (eventData) => {
                const todo = eventData.value.data.onCreateTodo;
                // Subscription event may occur multiple times due to the specification of the Optimistic response of AppSync api client.
                // https://aws-amplify.github.io/docs/js/api#offline-settings
                if (! todos.map(item => item.id).exists(todo.id)) {
                    dispatch({ type: SUBSCRIPTION, todo });
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [state.todos]);

    return (
        <div className='App'>
            <div className='todo-list'>
                <TodoForm addTodo={createNewTodo}/>
                {
                    state.todos.length > 0 ?
                    state.todos.map((todo, index) => <Todo key={index} text={todo.text} />):
                    <p>Add some todos!</p>
                }
            </div>
        </div>
    );
}

export default withAuthenticator(App,{
    signUpConfig: {
        hiddenDefaults: ['phone_number']
    }
});

