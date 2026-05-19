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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

  // Fetch admins
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admins');
      const json = await res.json();
      if (json.success) {
        setAdmins(json.data.admins || []);
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
                        Dashboard, Uniform Registry
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
                : 'Create a new admin account with access to Dashboard and Uniform Registry only.'}
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
                      <span className="text-xs text-slate-400 ml-1">(Dashboard & Uniform Registry)</span>
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
                      This account will have access to Dashboard and Uniform Registry only.
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
    </div>
  );
}
