import { useState, type ReactNode } from 'react';
import { TodoListStoresContext, createScopedTodoListStores } from './todoListStoresContext';

export const TodoListStoresProvider = ({ children }: { children: ReactNode }) => {
  const [stores] = useState(createScopedTodoListStores);

  return (
    <TodoListStoresContext.Provider value={stores}>
      {children}
    </TodoListStoresContext.Provider>
  );
};
