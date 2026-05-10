-- RLS Policies for InsForge Payments Integration

-- 1. Enable RLS on Payments attempts tables
ALTER TABLE payments.checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments.customer_portal_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for checkout sessions
CREATE POLICY insert_own_checkout ON payments.checkout_sessions
  FOR INSERT TO authenticated
  WITH CHECK (subject_id = (SELECT auth.uid())::text);

CREATE POLICY select_own_checkout ON payments.checkout_sessions
  FOR SELECT TO authenticated
  USING (subject_id = (SELECT auth.uid())::text);

-- 3. Create policies for billing portal sessions
CREATE POLICY insert_own_portal ON payments.customer_portal_sessions
  FOR INSERT TO authenticated
  WITH CHECK (subject_id = (SELECT auth.uid())::text);

CREATE POLICY select_own_portal ON payments.customer_portal_sessions
  FOR SELECT TO authenticated
  USING (subject_id = (SELECT auth.uid())::text);
