export interface Department {
  id: string
  name: string
  type: string
  parent_id: string | null
  manager_id: string | null
  created_at: string
}

export interface DepartmentWithManager extends Department {
  manager?: { full_name: string }
  employees_count?: number
}

export interface OrganizationEmployee {
  id: string
  full_name: string
  employee_number: string | null
  department_id: string | null
  direct_manager_id: string | null
}
