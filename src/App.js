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
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        className="inputTodoText"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Add some todos"
      />
    </form>
  );
}

function App() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [user, setUser] = useState("");

    async function getUser(){
        const user = await Auth.currentUserInfo();
        setUser(user);
        return user
    }

    useEffect(() => {
        getUser();
    }, [])

    async function getData(user) {
        let todoData = await API.graphql(graphqlOperation(listTodos, { owner: user.username }));
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
        getUser().then((user) => {
            getData(user);
        })
    }, [])

    useEffect(() => {
        let subscription;
        getUser().then((user) => {
            subscription = API.graphql(graphqlOperation(onCreateTodo, { owner: user.username })).subscribe({
                next: (eventData) => {
                    const todo = eventData.value.data.onCreateTodo;
                    dispatch({ type: SUBSCRIPTION, todo });
                }
            });
        })

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        let subscription;
        getUser().then((user) => {
            subscription = API.graphql(graphqlOperation(onUpdateTodo, { owner: user.username })).subscribe({
                next: (eventData) => {
                    const todo = eventData.value.data.onUpdateTodo;
                    dispatch({ type: UPDATE, todo });
                }
            });
        })

        return () => subscription.unsubscribe();
    }, []);
    
    function DoingTodos() {
        const sorted = state.todos
            .filter(todo => ! todo.complete)
            .sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1);
        return sorted.map((todo, index) => <Todo key={index} todo={todo} />)
    }
    function FinishedTodos() {
        const sorted = state.todos
            .filter(todo => todo.complete)
            .sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1);
        return sorted.map((todo, index) => <Todo key={index} todo={todo} />)
    }

    return (
        <div className='App'>
            <div className='todo-list'>
                <TodoForm addTodo={createNewTodo}/>
                <DoingTodos />
                <FinishedTodos />
            </div>
        </div>
    );
}

export default withAuthenticator(App,{
    signUpConfig: {
        hiddenDefaults: ['phone_number']
    }
});

