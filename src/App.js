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

async function createNewTodo(title, description) {
    const todo = { title: title, description: description };
    await API.graphql(graphqlOperation(createTodo, { input: todo }));
}

const Todo = ({ title, description }) => <div className="todo">{title}: {description}</div>;

function TodoForm({ addTodo }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = e => {
    e.preventDefault();
    if (!title || !description) return;
    addTodo(title, description);
    setTitle("");
    setDescription("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        className="todoTitle"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <input
        type="text"
        className="todoDescription"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <input type="submit" hidden={true}/>
    </form>
  );
}

function App() {
    const [state, dispatch] = useReducer(reducer, initialState);

    async function getData() {
        const todoData = await API.graphql(graphqlOperation(listTodos));
        dispatch({ type: QUERY, todos: todoData.data.listTodos.items });
    }

    useEffect(() => {
        getData();

        const subscription = API.graphql(graphqlOperation(onCreateTodo)).subscribe({
            next: (eventData) => {
                const todo = eventData.value.data.onCreateTodo;
                dispatch({ type: SUBSCRIPTION, todo });
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <div className='App'>
            <TodoForm addTodo={createNewTodo}/>
            <div className='todo-list'>
                {
                    state.todos.length > 0 ?
                    state.todos.map((todo, index) => <Todo key={index} title={todo.title} description={todo.description} />):
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

