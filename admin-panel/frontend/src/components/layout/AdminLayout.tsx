import { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut, UserCircle, LayoutDashboard, Package, Settings, Users, MessageSquareText, ShoppingBag, DollarSign, Star } from 'lucide-react'; // Import Star icon
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils'; // Import cn for conditional classnames

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { to: "/products", label: "Products", icon: Package, permission: "products" },
  { to: "/services", label: "Services", icon: Settings, permission: "services" },
  { to: "/testimonials", label: "Testimonials", icon: Star, permission: "testimonials" }, // Added Testimonials
  { to: "/custom-orders", label: "Custom Orders", icon: ShoppingBag, permission: "customOrders" },
  { to: "/orders-payments", label: "Orders & Payments", icon: DollarSign, permission: "ordersPayments" },
  { to: "/users", label: "Users", icon: Users, permission: "users" },
  { to: "/manage-admins", label: "Manage Admins", icon: UserCircle, permission: "manageAdmins" },
  { to: "/support-center", label: "Support Center", icon: MessageSquareText, permission: "support" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { admin, logout, checkPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Get current location

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!admin) {
    // This should ideally be handled by a PrivateRoute component,
    // but as a fallback, redirect to login if admin object is null.
    navigate('/login');
    return null;
  }

  const filteredNavItems = navItems.filter(item => checkPermission(item.permission));

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Sidebar (Desktop) */}
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
              <div className="h-6 w-6 rounded-lg bg-primary" />
              <span className="">DevForge Admin</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                    location.pathname === item.to
                      ? "bg-muted text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-auto p-4 border-t">
            <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col">
        {/* Navbar (Mobile & Desktop) */}
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          {/* Mobile Sheet Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link to="/dashboard" className="flex items-center gap-2 text-lg font-semibold mb-4">
                  <div className="h-6 w-6 rounded-lg bg-primary" />
                  <span className="">DevForge Admin</span>
                </Link>
                {filteredNavItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => { /* Close sheet if needed */ }}
                    className={cn(
                      "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:text-primary",
                      location.pathname === item.to
                        ? "bg-muted text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto pt-4 border-t">
                <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* User Dropdown */}
          <div className="w-full flex-1 text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <UserCircle className="h-5 w-5" />
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{admin?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast.info("Profile settings coming soon!")}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}