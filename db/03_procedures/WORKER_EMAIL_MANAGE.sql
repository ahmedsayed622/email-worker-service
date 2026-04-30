-- ═══════════════════════════════════════════════════════════════════════════════
-- Email Worker - Email Management Procedure
-- Purpose: Add or Remove email addresses from the worker mail system
-- Schema: back_office
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE PROCEDURE WORKER_EMAIL_MANAGE (
  p_operation     IN VARCHAR2,     -- 'ADD' or 'REMOVE'
  p_email         IN VARCHAR2,     -- Email address (e.g., 'user@alahlypharos.com')
  p_display_name  IN VARCHAR2,     -- Display name (e.g., 'Mohamed Ahmed')
  p_group_id      IN NUMBER,       -- Group ID to assign the email to
  p_address_id    IN NUMBER DEFAULT NULL,  -- Optional: ADDRESS_ID for REMOVE operation
  p_result_msg    OUT VARCHAR2     -- Result message
) AS
  v_address_id      NUMBER;
  v_existing_count  NUMBER;
  v_group_exists    NUMBER;
  v_member_count    NUMBER;
BEGIN
  -- Validate operation
  IF p_operation NOT IN ('ADD', 'REMOVE') THEN
    p_result_msg := 'ERROR: Invalid operation. Use ADD or REMOVE';
    RETURN;
  END IF;

  -- Validate email format (basic check)
  IF p_email IS NULL OR INSTR(p_email, '@') = 0 THEN
    p_result_msg := 'ERROR: Invalid email format';
    RETURN;
  END IF;

  -- Validate group exists
  SELECT COUNT(*)
  INTO v_group_exists
  FROM BACK_OFFICE.WORKER_MAIL_GROUP
  WHERE GROUP_ID = p_group_id AND IS_ACTIVE = 'Y';

  IF v_group_exists = 0 THEN
    p_result_msg := 'ERROR: Group ID ' || p_group_id || ' does not exist or is inactive';
    RETURN;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- OPERATION: ADD EMAIL
  -- ═══════════════════════════════════════════════════════════════════════════
  IF p_operation = 'ADD' THEN
    -- Check if email already exists
    BEGIN
      SELECT ADDRESS_ID, IS_ACTIVE
      INTO v_address_id, v_existing_count
      FROM BACK_OFFICE.WORKER_MAIL_ADDRESS
      WHERE UPPER(ADDRESS) = UPPER(p_email);

      -- Email exists - check if active or inactive
      IF v_existing_count = 'Y' THEN
        -- Email is already active - check if already in the group
        SELECT COUNT(*)
        INTO v_member_count
        FROM BACK_OFFICE.WORKER_MAIL_GROUP_MEMBER
        WHERE ADDRESS_ID = v_address_id
          AND GROUP_ID = p_group_id
          AND IS_ACTIVE = 'Y';

        IF v_member_count > 0 THEN
          p_result_msg := 'WARNING: Email already exists and is active in group ' || p_group_id;
        ELSE
          -- Reactivate membership or add new membership
          MERGE INTO BACK_OFFICE.WORKER_MAIL_GROUP_MEMBER t
          USING (SELECT v_address_id AS addr_id, p_group_id AS grp_id FROM DUAL) s
          ON (t.ADDRESS_ID = s.addr_id AND t.GROUP_ID = s.grp_id)
          WHEN MATCHED THEN
            UPDATE SET IS_ACTIVE = 'Y', UPDATED_AT = SYSTIMESTAMP
          WHEN NOT MATCHED THEN
            INSERT (GROUP_ID, ADDRESS_ID, IS_ACTIVE, CREATED_AT)
            VALUES (p_group_id, v_address_id, 'Y', SYSTIMESTAMP);

          COMMIT;
          p_result_msg := 'SUCCESS: Email re-added to group ' || p_group_id;
        END IF;
      ELSE
        -- Email exists but inactive - reactivate it
        UPDATE BACK_OFFICE.WORKER_MAIL_ADDRESS
        SET IS_ACTIVE = 'Y', UPDATED_AT = SYSTIMESTAMP, DISPLAY_NAME = p_display_name
        WHERE ADDRESS_ID = v_address_id;

        -- Reactivate or add group membership
        MERGE INTO BACK_OFFICE.WORKER_MAIL_GROUP_MEMBER t
        USING (SELECT v_address_id AS addr_id, p_group_id AS grp_id FROM DUAL) s
        ON (t.ADDRESS_ID = s.addr_id AND t.GROUP_ID = s.grp_id)
        WHEN MATCHED THEN
          UPDATE SET IS_ACTIVE = 'Y', UPDATED_AT = SYSTIMESTAMP
        WHEN NOT MATCHED THEN
          INSERT (GROUP_ID, ADDRESS_ID, IS_ACTIVE, CREATED_AT)
          VALUES (p_group_id, v_address_id, 'Y', SYSTIMESTAMP);

        COMMIT;
        p_result_msg := 'SUCCESS: Email reactivated and added to group ' || p_group_id || ' (ADDRESS_ID=' || v_address_id || ')';
      END IF;

    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        -- Email does not exist - create new address
        -- Get next ADDRESS_ID
        SELECT NVL(MAX(ADDRESS_ID), 0) + 1
        INTO v_address_id
        FROM BACK_OFFICE.WORKER_MAIL_ADDRESS;

        -- Insert new email address
        INSERT INTO BACK_OFFICE.WORKER_MAIL_ADDRESS (
          ADDRESS_ID,
          ADDRESS,
          DISPLAY_NAME,
          IS_ACTIVE,
          CREATED_AT
        ) VALUES (
          v_address_id,
          p_email,
          p_display_name,
          'Y',
          SYSTIMESTAMP
        );

        -- Add to group
        INSERT INTO BACK_OFFICE.WORKER_MAIL_GROUP_MEMBER (
          GROUP_ID,
          ADDRESS_ID,
          IS_ACTIVE,
          CREATED_AT
        ) VALUES (
          p_group_id,
          v_address_id,
          'Y',
          SYSTIMESTAMP
        );

        COMMIT;
        p_result_msg := 'SUCCESS: New email added with ADDRESS_ID=' || v_address_id || ' in group ' || p_group_id;
    END;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- OPERATION: REMOVE EMAIL
  -- ═══════════════════════════════════════════════════════════════════════════
  ELSIF p_operation = 'REMOVE' THEN
    -- Find address_id (either provided or lookup by email)
    IF p_address_id IS NOT NULL THEN
      v_address_id := p_address_id;
    ELSE
      BEGIN
        SELECT ADDRESS_ID
        INTO v_address_id
        FROM BACK_OFFICE.WORKER_MAIL_ADDRESS
        WHERE UPPER(ADDRESS) = UPPER(p_email);
      EXCEPTION
        WHEN NO_DATA_FOUND THEN
          p_result_msg := 'ERROR: Email not found';
          RETURN;
      END;
    END IF;

    -- Deactivate email address (soft delete)
    UPDATE BACK_OFFICE.WORKER_MAIL_ADDRESS
    SET IS_ACTIVE = 'N', UPDATED_AT = SYSTIMESTAMP
    WHERE ADDRESS_ID = v_address_id;

    -- Deactivate all group memberships
    UPDATE BACK_OFFICE.WORKER_MAIL_GROUP_MEMBER
    SET IS_ACTIVE = 'N', UPDATED_AT = SYSTIMESTAMP
    WHERE ADDRESS_ID = v_address_id;

    -- Get count of deactivated memberships
    SELECT COUNT(*)
    INTO v_member_count
    FROM BACK_OFFICE.WORKER_MAIL_GROUP_MEMBER
    WHERE ADDRESS_ID = v_address_id;

    COMMIT;
    p_result_msg := 'SUCCESS: Email removed (ADDRESS_ID=' || v_address_id || ', memberships deactivated=' || v_member_count || ')';

  END IF;

EXCEPTION
  WHEN OTHERS THEN
    ROLLBACK;
    p_result_msg := 'ERROR: ' || SQLERRM;
END WORKER_EMAIL_MANAGE;
/

-- ═══════════════════════════════════════════════════════════════════════════════
-- USAGE EXAMPLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Example 1: Add new email to Finance Group (GROUP_ID=1)
/*
DECLARE
  v_result VARCHAR2(500);
BEGIN
  WORKER_EMAIL_MANAGE(
    p_operation    => 'ADD',
    p_email        => 'newuser@alahlypharos.com',
    p_display_name => 'New User',
    p_group_id     => 1,  -- Finance Group
    p_result_msg   => v_result
  );
  DBMS_OUTPUT.PUT_LINE(v_result);
END;
/
*/

-- Example 2: Add email to multiple groups (call procedure twice)
/*
DECLARE
  v_result VARCHAR2(500);
BEGIN
  -- Add to Finance Group
  WORKER_EMAIL_MANAGE(
    p_operation    => 'ADD',
    p_email        => 'multigroup@alahlypharos.com',
    p_display_name => 'Multi Group User',
    p_group_id     => 1,  -- Finance
    p_result_msg   => v_result
  );
  DBMS_OUTPUT.PUT_LINE('Finance: ' || v_result);

  -- Add to Compliance Group
  WORKER_EMAIL_MANAGE(
    p_operation    => 'ADD',
    p_email        => 'multigroup@alahlypharos.com',
    p_display_name => 'Multi Group User',
    p_group_id     => 2,  -- Compliance
    p_result_msg   => v_result
  );
  DBMS_OUTPUT.PUT_LINE('Compliance: ' || v_result);
END;
/
*/

-- Example 3: Remove email by address
/*
DECLARE
  v_result VARCHAR2(500);
BEGIN
  WORKER_EMAIL_MANAGE(
    p_operation    => 'REMOVE',
    p_email        => 'olduser@alahlypharos.com',
    p_display_name => NULL,  -- Not needed for REMOVE
    p_group_id     => 1,     -- Not used for REMOVE
    p_result_msg   => v_result
  );
  DBMS_OUTPUT.PUT_LINE(v_result);
END;
/
*/

-- Example 4: Remove email by ADDRESS_ID
/*
DECLARE
  v_result VARCHAR2(500);
BEGIN
  WORKER_EMAIL_MANAGE(
    p_operation    => 'REMOVE',
    p_email        => NULL,  -- Not needed when using ADDRESS_ID
    p_display_name => NULL,
    p_group_id     => 1,     -- Not used for REMOVE
    p_address_id   => 5,     -- Direct ADDRESS_ID
    p_result_msg   => v_result
  );
  DBMS_OUTPUT.PUT_LINE(v_result);
END;
/
*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- View all active emails with their groups
/*
SELECT 
  a.ADDRESS_ID,
  a.ADDRESS,
  a.DISPLAY_NAME,
  g.GROUP_CODE,
  g.GROUP_NAME,
  gm.IS_ACTIVE AS MEMBER_ACTIVE
FROM BACK_OFFICE.WORKER_MAIL_ADDRESS a
JOIN BACK_OFFICE.WORKER_MAIL_GROUP_MEMBER gm ON a.ADDRESS_ID = gm.ADDRESS_ID
JOIN BACK_OFFICE.WORKER_MAIL_GROUP g ON gm.GROUP_ID = g.GROUP_ID
WHERE a.IS_ACTIVE = 'Y'
ORDER BY g.GROUP_CODE, a.ADDRESS;
*/

-- View inactive emails
/*
SELECT ADDRESS_ID, ADDRESS, DISPLAY_NAME, UPDATED_AT
FROM BACK_OFFICE.WORKER_MAIL_ADDRESS
WHERE IS_ACTIVE = 'N'
ORDER BY UPDATED_AT DESC;
*/

-- ═══════════════════════════════════════════════════════════════════════════════
