import {BrowserRouter,Routes,Route} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import StaffLogin from './pages/StaffLogin';
import StaffDashboard from './pages/StaffDashboard';

function App(){
  return(
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing/>}/>
          <Route path="/login" element={<Login/>}/>
          <Route path="/register" element={<Signup/>}/>
          <Route path="/dashboard" element={<Dashboard/>}/>
          <Route path="/admin-login" element={<AdminLogin/>}/>
          <Route path="/admin-dashboard" element={<AdminDashboard/>}/>
          <Route path="/staff-login" element={<StaffLogin/>}/>
          <Route path="/staff-dashboard" element={<StaffDashboard/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
export default App;