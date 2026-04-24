# Local Tenant Debugging

Use `http://localhost:3000` for local development.

Do not point `vertax.top` or `*.vertax.top` to `127.0.0.1` in the Windows `hosts` file. That hijacks the real Vercel domains and makes production subdomains look offline from your machine.

Recommended local workflow:

1. Start the app with `npm run dev`.
2. Sign in on `http://localhost:3000/login`.
3. Open `http://localhost:3000/customer/home` to work inside the tenant workspace.

If you want localhost to boot directly into one tenant view, set these optional variables in `.env`:

```env
NEXT_PUBLIC_VIEW_MODE="customer"
NEXT_PUBLIC_TENANT_SLUG="tdpaint"
```

This keeps local debugging on localhost and leaves the real `*.vertax.top` domains attached to Vercel only.
