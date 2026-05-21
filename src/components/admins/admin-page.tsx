'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  UserCog,
  Search,
  Mail,
  Lock,
  Crown,
  Users,
  Building2,
  Calendar,
  Bell,
  FileText,
  Ban,
  KeyRound,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminFormData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'super_admin';
}

const emptyForm: AdminFormData = {
  name: '',
  email: '',
  password: '',
  role: 'admin',
};

// Permission groups for the enhanced permission dialog
const PERMISSION_GROUPS = [
  {
    group: 'general',
    label: 'General',
    color: 'slate',
  },
  {
    group: 'workforce',
    label: 'Workforce',
    color: 'emerald',
  },
  {
    group: 'admin',
    label: 'Administration',
    color: 'amber',
  },
];

interface PermissionItem {
  id: string;
  name: string;
  slug: string;
  group: string;
  granted?: boolean;
}

const CONFIGURABLE_MENUS = [
  { key: 'employees', label: 'Employees', icon: Users },
  { key: 'sites', label: 'Sites', icon: Building2 },
  { key: 'attendance', label: 'Attendance', icon: Calendar },
  { key: 'leave_requests', label: 'Leave Requests', icon: FileText },
  { key: 'cancellation_requests', label: 'Cancellations', icon: Ban },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

export function AdminPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState<AdminFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState<Admin | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Permissions dialog state
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [permissionsAdmin, setPermissionsAdmin] = useState<Admin | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [adminPermissions, setAdminPermissions] = useState<Record<string, boolean>>({});
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [permSearch, setPermSearch] = useState('');

  // Admin access map for display in table
  const [adminAccessMap, setAdminAccessMap] = useState<Record<string, string[]>>({});

  // Fetch admins
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admins');
      const json = await res.json();
      if (json.success) {
        const adminsList: Admin[] = json.data.admins || [];
        setAdmins(adminsList);
        // Fetch permissions for each regular admin
        const regularAdmins = adminsList.filter((a: Admin) => a.role === 'admin');
        const accessMap: Record<string, string[]> = {};
        await Promise.all(
          regularAdmins.map(async (admin: Admin) => {
            try {
              const permRes = await fetch(`/api/menu-permissions?userId=${admin.id}`);
              const permJson = await permRes.json();
              if (permJson.success) {
                const allowedKeys: string[] = permJson.data.allowedMenus || [];
                const alwaysVisible = ['Dashboard', 'Uniform Registry'];
                const allowedLabels = allowedKeys.map((key: string) => {
                  const menu = CONFIGURABLE_MENUS.find(m => m.key === key);
                  return menu ? menu.label : key;
                });
                accessMap[admin.id] = [...alwaysVisible, ...allowedLabels];
              } else {
                accessMap[admin.id] = ['Dashboard', 'Uniform Registry'];
              }
            } catch {
              accessMap[admin.id] = ['Dashboard', 'Uniform Registry'];
            }
          })
        );
        setAdminAccessMap(accessMap);
      } else {
        setAdmins([]);
      }
    } catch {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchAdmins();
    }
  }, [user, fetchAdmins]);

  // Guard: only super_admin can access
  if (user?.role !== 'super_admin') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 mb-4">
            <Shield className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Access Denied</h2>
          <p className="text-slate-400 mt-2 max-w-md">
            You do not have permission to access this page. Only super admins can manage admin accounts.
          </p>
        </div>
      </div>
    );
  }

  // Filter admins by search
  const filteredAdmins = admins.filter((admin) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      admin.name.toLowerCase().includes(q) ||
      admin.email.toLowerCase().includes(q) ||
      admin.role.toLowerCase().includes(q)
    );
  });

  // Separate super admins and regular admins
  const superAdmins = filteredAdmins.filter(a => a.role === 'super_admin');
  const regularAdmins = filteredAdmins.filter(a => a.role === 'admin');

  // Validate form
  function validateForm(data: AdminFormData, isEdit: boolean): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!data.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!data.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Invalid email format';
    }
    if (!isEdit && !data.password.trim()) {
      errors.password = 'Password is required';
    } else if (data.password && data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    return errors;
  }

  // Open create dialog
  function handleCreate(defaultRole: 'admin' | 'super_admin' = 'admin') {
    setEditingAdmin(null);
    setFormData({ ...emptyForm, role: defaultRole });
    setFormErrors({});
    setDialogOpen(true);
  }

  // Open edit dialog
  function handleEdit(admin: Admin) {
    setEditingAdmin(admin);
    setFormData({ name: admin.name, email: admin.email, password: '', role: admin.role as 'admin' | 'super_admin' });
    setFormErrors({});
    setDialogOpen(true);
  }

  // Submit create/edit
  async function handleSubmit() {
    const isEdit = !!editingAdmin;
    const errors = validateForm(formData, isEdit);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Warn about creating super admin
    if (!isEdit && formData.role === 'super_admin') {
      const confirmed = window.confirm('Are you sure you want to create a Super Admin account? This user will have full system access including the ability to manage other admins.');
      if (!confirmed) return;
    }

    // Warn about changing role to super_admin
    if (isEdit && editingAdmin!.role !== 'super_admin' && formData.role === 'super_admin') {
      const confirmed = window.confirm('Are you sure you want to promote this user to Super Admin? They will gain full system access.');
      if (!confirmed) return;
    }

    // Warn about demoting super_admin
    if (isEdit && editingAdmin!.role === 'super_admin' && formData.role !== 'super_admin') {
      const otherSuperAdmins = admins.filter(a => a.role === 'super_admin' && a.id !== editingAdmin!.id);
      if (otherSuperAdmins.length === 0) {
        toast({
          title: 'Cannot Demote',
          description: 'There must be at least one Super Admin in the system.',
          variant: 'destructive',
        });
        return;
      }
      const confirmed = window.confirm('Are you sure you want to demote this Super Admin to a regular Admin? They will lose their elevated privileges.');
      if (!confirmed) return;
    }

    setSubmitting(true);
    try {
      let res: Response;
      if (isEdit) {
        const body: Record<string, string> = { name: formData.name, email: formData.email, role: formData.role };
        if (formData.password.trim()) body.password = formData.password;
        res = await fetch(`/api/admins/${editingAdmin.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, requesterId: user?.id }),
        });
      }
      const json = await res.json();

      if (json.success) {
        toast({
          title: isEdit ? 'Account Updated' : 'Account Created',
          description: `${formData.name} has been ${isEdit ? 'updated' : 'created'} as ${formData.role === 'super_admin' ? 'Super Admin' : 'Admin'} successfully.`,
        });
        setDialogOpen(false);
        fetchAdmins();
      } else {
        toast({
          title: 'Error',
          description: json.error || 'Something went wrong',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to connect to the server',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Open delete dialog
  function handleDelete(admin: Admin) {
    if (admin.role === 'super_admin') {
      const otherSuperAdmins = admins.filter(a => a.role === 'super_admin' && a.id !== admin.id);
      if (otherSuperAdmins.length === 0) {
        toast({
          title: 'Cannot Delete',
          description: 'There must be at least one Super Admin in the system. Promote another user first.',
          variant: 'destructive',
        });
        return;
      }
    }
    setDeletingAdmin(admin);
    setDeleteDialogOpen(true);
  }

  // Confirm delete
  async function confirmDelete() {
    if (!deletingAdmin) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admins/${deletingAdmin.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast({
          title: 'Account Deleted',
          description: `${deletingAdmin.name} has been removed successfully.`,
        });
        setDeleteDialogOpen(false);
        setDeletingAdmin(null);
        fetchAdmins();
      } else {
        toast({
          title: 'Error',
          description: json.error || 'Failed to delete account',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to connect to the server',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  }

  // Open permissions dialog and fetch current permissions
  async function handleManageAccess(admin: Admin) {
    setPermissionsAdmin(admin);
    setPermissionsLoading(true);
    setPermissionsDialogOpen(true);
    setPermSearch('');
    try {
      const res = await fetch(`/api/permissions?adminId=${admin.id}`);
      const json = await res.json();
      if (json.success) {
        const perms: PermissionItem[] = json.data.permissions || [];
        setAllPermissions(perms);
        const permMap: Record<string, boolean> = {};
        perms.forEach((p: PermissionItem) => { permMap[p.slug] = p.granted ?? false; });
        setAdminPermissions(permMap);
      }
    } catch {
      setAllPermissions([]);
      setAdminPermissions({});
    } finally {
      setPermissionsLoading(false);
    }
  }

  // Toggle a permission
  async function togglePermission(permissionSlug: string, granted: boolean) {
    if (!permissionsAdmin) return;
    setAdminPermissions(prev => ({ ...prev, [permissionSlug]: granted }));
    try {
      await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: permissionsAdmin.id, permissionSlug, granted }),
      });
      fetchAdmins();
    } catch {
      setAdminPermissions(prev => ({ ...prev, [permissionSlug]: !granted }));
      toast({ title: 'Error', description: 'Failed to update permission', variant: 'destructive' });
    }
  }

  // Select all / Clear all for a group
  async function toggleGroupPermissions(group: string, grant: boolean) {
    if (!permissionsAdmin) return;
    const groupPerms = allPermissions.filter(p => p.group === group);
    const updates: Record<string, boolean> = {};
    groupPerms.forEach(p => { updates[p.slug] = grant; });
    setAdminPermissions(prev => ({ ...prev, ...updates }));
    try {
      // Toggle each permission in the group
      await Promise.all(
        groupPerms.map(p =>
          fetch('/api/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminId: permissionsAdmin.id, permissionSlug: p.slug, granted: grant }),
          })
        )
      );
      fetchAdmins();
    } catch {
      // Revert
      const reverts: Record<string, boolean> = {};
      groupPerms.forEach(p => { reverts[p.slug] = !grant; });
      setAdminPermissions(prev => ({ ...prev, ...reverts }));
      toast({ title: 'Error', description: 'Failed to update permissions', variant: 'destructive' });
    }
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Admin Management</h2>
          <p className="text-slate-400 mt-1">
            Create and manage admin and super admin accounts for the system.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
            <Crown className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
          <Button
            onClick={() => handleCreate('super_admin')}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Crown className="h-4 w-4 mr-2" />
            Create Super Admin
          </Button>
          <Button
            onClick={() => handleCreate('admin')}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Admin
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search admins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:ring-blue-500/30 focus:border-blue-500/50"
        />
      </div>

      {/* Super Admins Section */}
      {superAdmins.length > 0 && (
        <Card className="bg-slate-800/50 border-amber-500/20 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-400" />
              Super Admins
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 ml-2">
                {superAdmins.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="overflow-x-auto rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-semibold">Name</TableHead>
                    <TableHead className="text-slate-400 font-semibold">Email</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-center">Role</TableHead>
                    <TableHead className="text-slate-400 font-semibold">Created</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {superAdmins.map((admin) => (
                    <TableRow key={admin.id} className="border-slate-700/50 hover:bg-slate-700/30">
                      <TableCell className="text-slate-200 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                            <Crown className="h-4 w-4 text-amber-400" />
                          </div>
                          {admin.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-500" />
                          {admin.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
                          Super Admin
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {formatDate(admin.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(admin)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(admin)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regular Admins Section */}
      <Card className="bg-slate-800/50 border-slate-700/50 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <UserCog className="h-4 w-4 text-slate-400" />
            Admin Directory
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 ml-2">
              {regularAdmins.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-slate-700 rounded-lg" />
              ))}
            </div>
          ) : regularAdmins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-700/50 mb-4">
                <Shield className="h-7 w-7 text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-400">
                {searchQuery ? 'No admins match your search' : 'No regular admins found'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {searchQuery
                  ? 'Try a different search term.'
                  : 'Click "Create Admin" to add your first admin account.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-semibold">Name</TableHead>
                    <TableHead className="text-slate-400 font-semibold">Email</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-center">Role</TableHead>
                    <TableHead className="text-slate-400 font-semibold">Access</TableHead>
                    <TableHead className="text-slate-400 font-semibold">Created</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regularAdmins.map((admin) => (
                    <TableRow key={admin.id} className="border-slate-700/50 hover:bg-slate-700/30">
                      <TableCell className="text-slate-200 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                            <span className="text-sm font-semibold text-blue-400">
                              {admin.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {admin.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-500" />
                          {admin.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20">
                          Admin
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        <div className="flex flex-wrap gap-1">
                          {(adminAccessMap[admin.id] || ['Dashboard', 'Uniform Registry']).map((label) => (
                            <Badge
                              key={label}
                              variant="secondary"
                              className="bg-slate-700/50 text-slate-300 text-[10px] px-1.5 py-0 h-4"
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {formatDate(admin.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleManageAccess(admin)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                            title="Manage Access"
                          >
                            <KeyRound className="h-4 w-4" />
                            <span className="sr-only">Manage Access</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(admin)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(admin)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {editingAdmin ? (
                <>
                  <Pencil className="h-4 w-4 text-blue-400" />
                  Edit Account
                </>
              ) : formData.role === 'super_admin' ? (
                <>
                  <Crown className="h-4 w-4 text-amber-400" />
                  Create Super Admin
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 text-blue-400" />
                  Create Admin
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingAdmin
                ? 'Update account details. Leave password blank to keep unchanged.'
                : formData.role === 'super_admin'
                ? 'Create a new Super Admin account with full system access.'
                : 'Create a new admin account. You can configure menu access after creation.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                Role <span className="text-red-400">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'super_admin') => setFormData(f => ({ ...f, role: value }))}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="admin" className="text-slate-200 focus:bg-slate-700 focus:text-white">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-blue-400" />
                      <span>Admin</span>
                      <span className="text-xs text-slate-400 ml-1">(Configurable access)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="super_admin" className="text-slate-200 focus:bg-slate-700 focus:text-white">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-400" />
                      <span>Super Admin</span>
                      <span className="text-xs text-slate-400 ml-1">(Full access)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="admin-name" className="text-slate-300">
                Name <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="admin-name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, name: e.target.value }));
                    if (formErrors.name) setFormErrors((fe) => ({ ...fe, name: '' }));
                  }}
                  className="pl-9 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:ring-blue-500/30 focus:border-blue-500/50"
                />
              </div>
              {formErrors.name && (
                <p className="text-xs text-red-400">{formErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-slate-300">
                Email <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, email: e.target.value }));
                    if (formErrors.email) setFormErrors((fe) => ({ ...fe, email: '' }));
                  }}
                  className="pl-9 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:ring-blue-500/30 focus:border-blue-500/50"
                />
              </div>
              {formErrors.email && (
                <p className="text-xs text-red-400">{formErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-slate-300">
                Password {editingAdmin ? '' : <span className="text-red-400">*</span>}
                {editingAdmin && (
                  <span className="text-slate-500 font-normal ml-1">(optional)</span>
                )}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="admin-password"
                  type="password"
                  placeholder={editingAdmin ? 'Leave blank to keep current' : 'Enter password (min 6 chars)'}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, password: e.target.value }));
                    if (formErrors.password) setFormErrors((fe) => ({ ...fe, password: '' }));
                  }}
                  className="pl-9 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:ring-blue-500/30 focus:border-blue-500/50"
                />
              </div>
              {formErrors.password && (
                <p className="text-xs text-red-400">{formErrors.password}</p>
              )}
            </div>

            {/* Super Admin Warning */}
            {formData.role === 'super_admin' && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-400">
                <div className="flex items-start gap-2">
                  <Crown className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Super Admin Privileges</p>
                    <p className="text-amber-400/80 text-xs mt-1">
                      This account will have full system access including managing other admins, creating super admins, and accessing all system features.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Access Info */}
            {formData.role === 'admin' && !editingAdmin && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm text-blue-400">
                <div className="flex items-start gap-2">
                  <UserCog className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Admin Access</p>
                    <p className="text-blue-400/80 text-xs mt-1">
                      This account will have access to Dashboard and Uniform Registry by default. You can configure additional menu access after creation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-700"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className={formData.role === 'super_admin' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {editingAdmin ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                <>
                  {editingAdmin ? (
                    <>
                      <Pencil className="h-4 w-4 mr-2" />
                      Update Account
                    </>
                  ) : (
                    <>
                      {formData.role === 'super_admin' ? (
                        <>
                          <Crown className="h-4 w-4 mr-2" />
                          Create Super Admin
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Admin
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700 text-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete {deletingAdmin?.role === 'super_admin' ? 'Super Admin' : 'Admin'} Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete the {deletingAdmin?.role === 'super_admin' ? 'super admin' : 'admin'} account for{' '}
              <span className="text-white font-semibold">{deletingAdmin?.name}</span>? This action
              cannot be undone. The user will lose all access to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              className="text-slate-400 hover:text-white hover:bg-slate-700 border-slate-700"
              disabled={deleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white focus:ring-red-500/30 focus:ring-offset-slate-800 border-0"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting...
                </span>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Access Dialog - Enhanced Grouped Permissions */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200 sm:max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald-400" />
              Manage Access — {permissionsAdmin?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configure which modules this admin can access. Super Admins have unrestricted access.
            </DialogDescription>
          </DialogHeader>

          {/* Permission summary */}
          {!permissionsLoading && allPermissions.length > 0 && (
            <div className="flex items-center gap-3 px-1">
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${(Object.values(adminPermissions).filter(Boolean).length / allPermissions.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {Object.values(adminPermissions).filter(Boolean).length}/{allPermissions.length} granted
              </span>
            </div>
          )}

          {/* Search permissions */}
          {!permissionsLoading && allPermissions.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Search permissions..."
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                className="pl-9 h-8 text-sm bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500"
              />
            </div>
          )}

          <div className="space-y-3 py-1 overflow-y-auto max-h-[50vh]">
            {permissionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full bg-slate-700 rounded" />
                ))}
              </div>
            ) : allPermissions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No permissions found</div>
            ) : (
              PERMISSION_GROUPS.map((pg) => {
                const groupPerms = allPermissions.filter(p => p.group === pg.group);
                if (groupPerms.length === 0) return null;
                const filteredPerms = permSearch
                  ? groupPerms.filter(p => p.name.toLowerCase().includes(permSearch.toLowerCase()))
                  : groupPerms;
                if (filteredPerms.length === 0) return null;
                const grantedCount = groupPerms.filter(p => adminPermissions[p.slug]).length;
                const allGranted = grantedCount === groupPerms.length;
                const groupColorMap: Record<string, string> = {
                  general: 'border-slate-600/50',
                  workforce: 'border-emerald-600/50',
                  admin: 'border-amber-600/50',
                };
                const groupLabelColorMap: Record<string, string> = {
                  general: 'text-slate-400',
                  workforce: 'text-emerald-400',
                  admin: 'text-amber-400',
                };

                return (
                  <div
                    key={pg.group}
                    className={cn('rounded-lg bg-slate-900/50 border px-4 py-3', groupColorMap[pg.group] || 'border-slate-700/50')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-xs font-semibold uppercase tracking-wider', groupLabelColorMap[pg.group] || 'text-slate-500')}>
                          {pg.label}
                        </p>
                        <Badge variant="secondary" className="bg-slate-700/50 text-slate-300 text-[10px] px-1.5 py-0 h-4">
                          {grantedCount}/{groupPerms.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleGroupPermissions(pg.group, !allGranted)}
                          className={cn(
                            'text-[10px] font-medium px-2 py-0.5 rounded transition-colors',
                            allGranted
                              ? 'text-red-400 hover:bg-red-500/10'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          )}
                        >
                          {allGranted ? 'Clear All' : 'Select All'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {filteredPerms.map((perm) => {
                        const isEnabled = adminPermissions[perm.slug] ?? false;
                        return (
                          <div
                            key={perm.id}
                            className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-700/30 transition-colors"
                          >
                            <span className={cn('text-sm font-medium', isEnabled ? 'text-white' : 'text-slate-400')}>
                              {perm.name}
                            </span>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => togglePermission(perm.slug, checked)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPermissionsDialogOpen(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

