import React, {useEffect, useReducer} from 'react';

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

async function createNewTodo() {
    const todo = { title: "Use AWS AppSync", description: "Realtime and offline" };
    await API.graphql(graphqlOperation(createTodo, { input: todo }));
}

function App() {
    const [state, dispatch] = useReducer(reducer, initialState);

    useEffect(() => {
        async function getData() {
            const todoData = await API.graphql(graphqlOperation(listTodos));
            dispatch({ type: QUERY, todos: todoData.data.listTodos.items });
        }
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
        <div>
        <div className="App">
            <button onClick={createNewTodo}>Add Todo</button>
        </div>
        <div>
        {state.todos.length > 0 ?
            state.todos.map((todo) => <p key={todo.id}>{todo.title} : {todo.description}</p>):
            <p>Add some todos!</p>
        }
        </div>
        </div>
    );
}

export default withAuthenticator(App);

