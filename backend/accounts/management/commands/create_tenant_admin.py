import getpass

from django.core.management.base import BaseCommand, CommandError

from accounts.models import User
from tenants.models import Tenant


class Command(BaseCommand):
    """Bootstraps a tenant's first admin user — there's no API for this
    (UserViewSet is admin-only, and a brand new tenant has no admin yet to
    call it). Same chicken-and-egg reason tenants.create_superadmin is
    CLI-only; this is its per-tenant counterpart.

    Not named create_tenant_superuser — django_tenants itself ships a
    built-in command by that exact name (tenant-aware createsuperuser), which
    would otherwise shadow this one. Same reason provision_tenant isn't named
    create_tenant."""

    help = "Creates the first admin user for a tenant."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", required=True, help="Tenant schema_name, e.g. 'acme'.")
        parser.add_argument("--email", help="Login email (also used as username).")
        parser.add_argument("--password", help="Password (omit to be prompted).")
        parser.add_argument("--name", default="", help="Optional display name.")
        parser.add_argument("--noinput", action="store_true", help="Don't prompt; --email and --password required.")

    def handle(self, *args, **options):
        try:
            tenant = Tenant.objects.exclude(schema_name="public").get(schema_name=options["tenant"])
        except Tenant.DoesNotExist as exc:
            raise CommandError(f"No tenant with schema_name '{options['tenant']}'.") from exc

        email = options["email"]
        password = options["password"]

        if options["noinput"]:
            if not email or not password:
                raise CommandError("--email and --password are required with --noinput.")
        else:
            email = email or input("Email: ")
            while not password:
                password = getpass.getpass("Password: ")
                confirm = getpass.getpass("Password (again): ")
                if password != confirm:
                    self.stderr.write("Passwords didn't match.")
                    password = None

        if User.objects.filter(username=email).exists():
            raise CommandError(f"A user with email '{email}' already exists.")

        user = User(
            username=email,
            email=email,
            first_name=options["name"],
            role=User.Role.ADMIN,
            tenant=tenant,
        )
        user.set_password(password)
        user.save()

        self.stdout.write(self.style.SUCCESS(f"Created admin user '{user.email}' for tenant '{tenant.name}'."))
