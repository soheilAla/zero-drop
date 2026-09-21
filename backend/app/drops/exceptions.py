class DropError(Exception):
    pass


class DropValidationError(DropError):
    pass


class DropTooLargeError(DropError):
    pass
