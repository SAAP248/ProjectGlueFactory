import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard/index';
import AlarmDashboard from './pages/AlarmDashboard';
import DispatchCalendar from './pages/DispatchCalendar';
import DispatchMap from './pages/DispatchMap';
import Calendar from './pages/Calendar';
import Customers from './pages/Customers';
import CustomerProfile from './pages/CustomerProfile/index';
import Chat from './pages/Chat';
import Deals from './pages/Deals/index';
import ProjectManagement from './pages/ProjectManagement/index';
import WorkOrders from './pages/WorkOrders/index';
import Tasks from './pages/Tasks';
import Warehouses from './pages/Inventory/Warehouses';
import Distributors from './pages/Inventory/Distributors';
import PurchaseOrders from './pages/Inventory/PurchaseOrders';
import Products from './pages/Inventory/Products';
import Packages from './pages/Inventory/Packages';
import SiteInventory from './pages/Inventory/SiteInventory';
import Estimates from './pages/Accounting/Estimates';
import Invoices from './pages/Accounting/Invoices';
import Statements from './pages/Accounting/Statements';
import Transactions from './pages/Accounting/Transactions';
import TimeAttendance from './pages/TimeAttendance';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import TechnicianPortal from './pages/TechnicianPortal';
import CustomerPortal from './pages/CustomerPortal';
import Tickets from './pages/Tickets/index';
import Leads from './pages/Leads/index';
import PhotosPage from './pages/Photos/index';
import DocumentsPage from './pages/Documents/index';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const navigateToCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setCurrentPage('customer-profile');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'alarm-dashboard':
        return <AlarmDashboard />;
      case 'dispatch-calendar':
        return <DispatchCalendar />;
      case 'dispatch-map':
        return <DispatchMap />;
      case 'calendar':
        return <Calendar />;
      case 'customers':
        return <Customers onViewCustomer={navigateToCustomer} />;
      case 'customer-profile':
        return (
          <CustomerProfile
            customerId={selectedCustomerId}
            onBack={() => setCurrentPage('customers')}
            onViewCustomer={navigateToCustomer}
          />
        );
      case 'chat':
        return <Chat />;
      case 'leads':
        return <Leads />;
      case 'deals':
        return <Deals />;
      case 'projects':
        return <ProjectManagement />;
      case 'work-orders':
        return <WorkOrders />;
      case 'tickets':
        return <Tickets />;
      case 'tasks':
        return <Tasks />;
      case 'warehouses':
        return <Warehouses />;
      case 'distributors':
        return <Distributors />;
      case 'purchase-orders':
        return <PurchaseOrders />;
      case 'products':
        return <Products />;
      case 'packages':
        return <Packages />;
      case 'site-inventory':
        return <SiteInventory />;
      case 'estimates':
        return <Estimates />;
      case 'invoices':
        return <Invoices />;
      case 'statements':
        return <Statements />;
      case 'transactions':
        return <Transactions />;
      case 'time-attendance':
        return <TimeAttendance />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'technician-portal':
        return <TechnicianPortal />;
      case 'customer-portal':
        return <CustomerPortal />;
      case 'photos':
        return <PhotosPage />;
      case 'documents':
        return <DocumentsPage />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
