import React, {useReducer} from 'react';

import API, { graphqlOperation } from '@aws-amplify/api';
import PubSub from '@aws-amplify/pubsub';

import { createTodo } from './graphql/mutations';
import { listTodos } from './graphql/queries';

import awsconfig from './aws-exports';
import './App.css';

API.configure(awsconfig);
PubSub.configure(awsconfig);

// Action Types
const QUERY = 'QUERY';

const initialState = {
    todos: [],
};

const reducer = (state, action) => {
    switch (action.type) {
        case QUERY:
            return {...state, todos: action.todos};
        default:
            return state;
    }
};

async function createNewTodo() {
    const todo = { name: "Use AWS AppSync", description: "Realtime and offline" };
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
    }, []);

    return (
        <div>
        <div className="App">
            <button onClick={createNewTodo}>Add Todo</button>
        </div>
        <div>
        {state.todos.length > 0 ?
            state.todos.map((todoen => <p key={todo.id}>{todo.name} : {todo.description}</p>):
            <p>Add some todos!</p>
        }
        </div>
        </div>
    );
}

export default App;
