from django.utils import timezone

from accounts.models import Permission, User
from audit.models import AuditLogEntry
from common.testing import TenantAPITestCase
from requisitions.models import Requisition


class RequisitionEditDeleteTests(TenantAPITestCase):
    """Editing, deleting and deciding a requisition.

    A requisition can only be changed while it is still a request. Once it has
    been approved something downstream was authorised on the strength of it,
    and once rejected there is a decision on record — editing either would
    quietly rewrite history, so the API refuses regardless of permissions.
    """

    def setUp(self):
        super().setUp()
        self.admin = self.make_user("admin1")

    def make_requisition(self, **overrides) -> Requisition:
        fields = {
            "requested_by": "Accounts",
            "department": "Finance",
            "purpose": "Bank run",
            "destination": "Gulberg",
            "required_date_time": timezone.now(),
        }
        fields.update(overrides)
        return Requisition.objects.create(**fields)

    def staff(self, username, direct=()):
        user = self.make_user(username, user_type=User.UserType.STAFF)
        user.direct_permissions.set(Permission.objects.filter(codename__in=direct))
        return user

    def test_a_pending_requisition_can_be_edited(self):
        requisition = self.make_requisition()
        response = self.as_user(self.admin).patch(
            f"/api/requisitions/{requisition.id}/", {"destination": "Model Town"}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        requisition.refresh_from_db()
        self.assertEqual(requisition.destination, "Model Town")

    def test_an_approved_requisition_cannot_be_edited(self):
        requisition = self.make_requisition(status=Requisition.Status.APPROVED)
        response = self.as_user(self.admin).patch(
            f"/api/requisitions/{requisition.id}/", {"destination": "Model Town"}, format="json"
        )
        self.assertEqual(response.status_code, 409)
        requisition.refresh_from_db()
        self.assertEqual(requisition.destination, "Gulberg")

    def test_an_approved_requisition_cannot_be_deleted(self):
        requisition = self.make_requisition(status=Requisition.Status.APPROVED)
        response = self.as_user(self.admin).delete(f"/api/requisitions/{requisition.id}/")
        self.assertEqual(response.status_code, 409)
        self.assertTrue(Requisition.objects.filter(pk=requisition.pk).exists())

    def test_a_rejected_requisition_is_equally_closed(self):
        requisition = self.make_requisition(status=Requisition.Status.REJECTED)
        self.assertEqual(
            self.as_user(self.admin).delete(f"/api/requisitions/{requisition.id}/").status_code, 409
        )
        self.assertEqual(
            self.as_user(self.admin)
            .patch(f"/api/requisitions/{requisition.id}/", {"purpose": "Other"}, format="json")
            .status_code,
            409,
        )

    def test_deleting_a_pending_requisition_is_audited(self):
        requisition = self.make_requisition()
        response = self.as_user(self.admin).delete(f"/api/requisitions/{requisition.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Requisition.objects.filter(pk=requisition.pk).exists())
        self.assertTrue(
            AuditLogEntry.objects.filter(transaction__startswith="Requisition deleted").exists()
        )

    def test_staff_need_the_matching_permission(self):
        requisition = self.make_requisition()
        viewer = self.staff("viewer1", direct=["requisitions.view"])
        self.assertEqual(
            self.as_user(viewer)
            .patch(f"/api/requisitions/{requisition.id}/", {"purpose": "Other"}, format="json")
            .status_code,
            403,
        )
        self.assertEqual(self.as_user(viewer).delete(f"/api/requisitions/{requisition.id}/").status_code, 403)

        editor = self.staff("editor1", direct=["requisitions.view", "requisitions.edit"])
        self.assertEqual(
            self.as_user(editor)
            .patch(f"/api/requisitions/{requisition.id}/", {"purpose": "Other"}, format="json")
            .status_code,
            200,
        )
        # Editing is not deleting: separate grants, as everywhere else.
        self.assertEqual(self.as_user(editor).delete(f"/api/requisitions/{requisition.id}/").status_code, 403)

        remover = self.staff("remover1", direct=["requisitions.view", "requisitions.delete"])
        self.assertEqual(self.as_user(remover).delete(f"/api/requisitions/{requisition.id}/").status_code, 204)

    def test_approving_needs_the_approve_permission_and_is_audited(self):
        requisition = self.make_requisition()
        editor = self.staff("editor2", direct=["requisitions.view", "requisitions.edit"])
        self.assertEqual(
            self.as_user(editor).post(f"/api/requisitions/{requisition.id}/approve/").status_code, 403
        )

        approver = self.staff("approver1", direct=["requisitions.view", "requisitions.approve"])
        response = self.as_user(approver).post(f"/api/requisitions/{requisition.id}/approve/")
        self.assertEqual(response.status_code, 200, response.data)
        requisition.refresh_from_db()
        self.assertEqual(requisition.status, Requisition.Status.APPROVED)
        self.assertTrue(AuditLogEntry.objects.filter(transaction__startswith="Requisition approved").exists())

    def test_a_decided_requisition_cannot_be_decided_again(self):
        requisition = self.make_requisition(status=Requisition.Status.APPROVED)
        response = self.as_user(self.admin).post(f"/api/requisitions/{requisition.id}/reject/")
        self.assertEqual(response.status_code, 400)
