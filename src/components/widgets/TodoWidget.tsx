import { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2 } from 'lucide-react';
import { Widget } from '../Widget';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoWidgetProps {
  id: string;
  accentColor: string;
  defaultPosition?: { x: number; y: number };
  onClose?: () => void;
}

export function TodoWidget({ id, accentColor, defaultPosition, onClose }: TodoWidgetProps) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');

  const addTodo = () => {
    if (!newTodo.trim()) return;
    
    setTodos([...todos, {
      id: Date.now().toString(),
      text: newTodo,
      completed: false
    }]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <Widget
      id={id}
      title="ToDo"
      icon={<CheckSquare size={14} />}
      accentColor={accentColor}
      defaultPosition={defaultPosition}
      onClose={onClose}
    >
      <div className="min-w-[250px]">
        {/* Add Todo */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="タスクを追加..."
            className="flex-1 px-3 py-2 bg-white/40 border border-white/50 rounded-lg text-xs outline-none focus:ring-2 focus:ring-white/60"
          />
          <button
            onClick={addTodo}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: accentColor }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Todo List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {todos.length === 0 ? (
            <div className="text-center text-slate-400 py-8 text-xs">
              タスクがありません
            </div>
          ) : (
            todos.map(todo => (
              <div
                key={todo.id}
                className="flex items-center gap-2 p-2 bg-white/30 rounded-lg group"
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  style={{ color: todo.completed ? accentColor : 'currentColor' }}
                >
                  {todo.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
                <span
                  className={`flex-1 text-xs ${
                    todo.completed ? 'line-through text-slate-400' : 'text-slate-700'
                  }`}
                >
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Widget>
  );
}
