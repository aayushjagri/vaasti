"""
Vasati — CLI: Provision new organization
Usage: docker compose exec backend python scripts/create_tenant.py <org_name> <slug> <domain>
"""

# TODO: Build in Step 5 once Organization model is ready
import sys

def main():
    if len(sys.argv) < 4:
        print("Usage: python scripts/create_tenant.py <org_name> <slug> <domain>")
        sys.exit(1)
    print("create_tenant script not yet implemented — models still being built.")

if __name__ == '__main__':
    main()
