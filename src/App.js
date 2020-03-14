import React, {useEffect, useReducer, useState} from 'react';

import API, { graphqlOperation } from '@aws-amplify/api';
import Auth from '@aws-amplify/auth';
import PubSub from '@aws-amplify/pubsub';

import { withAuthenticator } from 'aws-amplify-react';

import { createTodo, updateTodo } from './graphql/mutations';
import { listTodos } from './graphql/queries';
import { onCreateTodo, onUpdateTodo } from './graphql/subscriptions';

import awsconfig from './aws-exports';
import './App.css';

API.configure(awsconfig);
Auth.configure(awsconfig);
PubSub.configure(awsconfig);

// Action Types
const QUERY = 'QUERY';
const SUBSCRIPTION = 'SUBSCRIPTION';
const UPDATE = 'UPDATE';

const initialState = {
    todos: [],
};

const reducer = (state, action) => {
    switch (action.type) {
        case QUERY:
            return {...state, todos: action.todos};
        case SUBSCRIPTION:
            return {...state, todos:[...state.todos, action.todo]};
        case UPDATE:
            const updated = action.todo;
            const nextTodos = state.todos.map(todo => {
                return todo.id === updated.id ? updated : todo
            });

            return {...state, todos: nextTodos }
        default:
            return state;
    }
};

async function createNewTodo(text) {
    const todo = { text: text, complete: false }; 
    await API.graphql(graphqlOperation(createTodo, { input: todo }));
}

async function completeTodo(event, todo) {
    event.preventDefault();
    await API.graphql(graphqlOperation(updateTodo, { input: {
        id: todo.id,
        complete: !todo.complete
    }}));
}

const Todo = ({ todo }) => (
    <div className="todo">
        <p>
        {
            todo.complete ?
                <a href="#" onClick={(event) => completeTodo(event, todo)}><span className="completed"></span></a> :
                <a href="#" onClick={(event) => completeTodo(event, todo)}><span className="doing"></span></a>
        }
        <span style={{textDecoration: todo.complete ? "line-through": ""}}>
            {todo.text}
        </span>
        </p>
    </div>
);

function TodoForm({ addTodo }) {
  const [text, setText] = useState("");

  const handleSubmit = e => {
    e.preventDefault();
    if (!text) return;
    addTodo(text);
    setText("");
  };

  return (
      <div className="todoForm">
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        className="inputTodoText"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add some todos"
      />
    </form>
      </div>
  );
}

function App() {
    const [state, dispatch] = useReducer(reducer, initialState);

    async function getData() {
        let todoData = await API.graphql(graphqlOperation(listTodos));
        const todos = todoData.data.listTodos.items;

        let nextToken = todoData.data.listTodos.nextToken;

        while (nextToken) {
            const next = await API.graphql(graphqlOperation(listTodos, { nextToken }));
            todos.push(...next.data.listTodos.items);
            nextToken = next.data.listTodos.nextToken;
        }

        dispatch({ type: QUERY, todos: todos });
    }

    useEffect(() => {
        getData();
    }, [])

    useEffect(() => {
        const subscription = API.graphql(graphqlOperation(onCreateTodo)).subscribe({
            next: (eventData) => {
                const todo = eventData.value.data.onCreateTodo;
                dispatch({ type: SUBSCRIPTION, todo });
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const subscription = API.graphql(graphqlOperation(onUpdateTodo)).subscribe({
            next: (eventData) => {
                const todo = eventData.value.data.onUpdateTodo;
                console.log("at update subscription");
                dispatch({ type: UPDATE, todo });
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <div className='App'>
            <div className='todo-list'>
                <TodoForm addTodo={createNewTodo}/>
                {
                    state.todos.map((todo, index) => <Todo key={index} todo={todo} />)
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

