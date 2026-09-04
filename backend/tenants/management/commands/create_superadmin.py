import getpass

from django.core.management.base import BaseCommand, CommandError

from tenants.models import SuperAdmin


class Command(BaseCommand):
    """Bootstraps the first Super Admin — there's no API for this (chicken-and-egg:
    creating a super admin via the API requires already being one), same reason
    Django's own createsuperuser and accounts' create_tenant_admin are CLI-only."""

    help = "Creates a Super Admin account."

    def add_arguments(self, parser):
        parser.add_argument("--username", help="Login username.")
        parser.add_argument("--password", help="Password (omit to be prompted).")
        parser.add_argument("--email", default="", help="Optional email.")
        parser.add_argument("--name", default="", help="Optional display name.")
        parser.add_argument("--noinput", action="store_true", help="Don't prompt; --username and --password required.")

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]

        if options["noinput"]:
            if not username or not password:
                raise CommandError("--username and --password are required with --noinput.")
        else:
            username = username or input("Username: ")
            while not password:
                password = getpass.getpass("Password: ")
                confirm = getpass.getpass("Password (again): ")
                if password != confirm:
                    self.stderr.write("Passwords didn't match.")
                    password = None

        if SuperAdmin.objects.filter(username=username).exists():
            raise CommandError(f"A super admin with username '{username}' already exists.")

        admin = SuperAdmin(username=username, email=options["email"], name=options["name"])
        admin.set_password(password)
        admin.save()

        self.stdout.write(self.style.SUCCESS(f"Created super admin '{admin.username}'."))
