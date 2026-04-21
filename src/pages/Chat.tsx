import { MessageSquare, Send } from 'lucide-react';

export default function Chat() {
  const conversations = [
    { id: 1, customer: 'Acme Corporation', lastMessage: 'Thanks for the quick response!', time: '10 min ago', unread: 2 },
    { id: 2, customer: 'Smith Residence', lastMessage: 'What time will you arrive?', time: '1 hour ago', unread: 0 },
    { id: 3, customer: 'Downtown Mall', lastMessage: 'Please send the invoice', time: '3 hours ago', unread: 1 },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
        <p className="text-gray-600 mt-1">SMS communications with customers</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Conversations</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {conversations.map((conv) => (
              <div key={conv.id} className="p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-gray-900">{conv.customer}</div>
                  {conv.unread > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {conv.unread}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 truncate">{conv.lastMessage}</div>
                <div className="text-xs text-gray-500 mt-1">{conv.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Acme Corporation</h3>
            <p className="text-sm text-gray-600">(555) 123-4567</p>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>SMS chat messages would appear here</p>
            </div>
          </div>
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
